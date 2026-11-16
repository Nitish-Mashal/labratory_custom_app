// Lab Test: accurate header status indicator.
//
// The "Lab Test Age Generate" client script (someshwara_hospital fixture)
// re-fetches Patient.custom_age on every form refresh and calls
// frm.set_value("patient_age", ...). Saved Lab Tests often have
// patient_age NULL in the database while custom_age holds e.g. "28", so the
// value always differs, the form gets re-dirtied right after save and the
// header flips to "Not Saved".
//
// This script:
//  1. Shows a green "Saved" indicator right after a successful save and
//     re-asserts it over the next few seconds (the age script's async
//     set_value and later refreshes can briefly overwrite it).
//  2. Detects that spurious patient_age-only dirty and reverts it silently,
//     restoring the correct indicator ("Draft"/status, or "Saved" if the
//     document was just saved).

const LT_AUDIT_KEYS = ["modified", "modified_by"];
const LT_SUBMIT_KEYS = [
	"docstatus",
	"status",
	"submitted_date",
	"submitted_by",
	"workflow_state",
];
const LT_JUST_SAVED_MS = 5000;
const LT_REASSERT_DELAYS = [300, 800, 1500, 3000];

frappe.ui.form.on("Lab Test", {
	onload(frm) {
		frm.__lt_saved = false;
		frm.__lt_saved_docname = null;
		frm.__lt_saved_at = 0;
	},

	after_save(frm) {
		frm.__lt_saved = true;
		frm.__lt_saved_docname = frm.docname;
		frm.__lt_saved_at = Date.now();

		// The in-memory doc is clean and post-sync at this point: take the
		// baseline before the age script's async set_value can land.
		if (!frm.is_dirty()) {
			frm.__lt_snapshot = take_snapshot(frm.doc);
		}
		fetch_expected_age(frm);

		show_saved_indicator(frm);
		schedule_saved_reassert(frm);
	},

	refresh(frm) {
		if (!frm.doc || frm.doc.__islocal) {
			return;
		}

		// Follow the document across switches inside the same form
		if (frm.__lt_saved && frm.__lt_saved_docname !== frm.docname) {
			frm.__lt_saved = false;
		}

		// Remember the last known-clean state (used to detect the
		// spurious patient_age dirty triggered by the age client script)
		if (!frm.is_dirty()) {
			frm.__lt_snapshot = take_snapshot(frm.doc);
			fetch_expected_age(frm);
		} else {
			// The dirty event may have raced the guard binding - re-check
			maybe_revert(frm);
		}

		bind_spurious_dirty_guard(frm);

		// Right after a save, core would show the status (e.g. "Draft")
		if (frm.__lt_saved && !frm.is_dirty()) {
			show_saved_indicator(frm);
		}
	},
});

// Leaving the form page: a later reopen must show the normal status again
$(document).on("form-unload.lab_test_indicator", function (e, form) {
	if (form && form.doctype === "Lab Test") {
		form.__lt_saved = false;
		form.__lt_saved_docname = null;
		form.__lt_saved_at = 0;
	}
});

function show_saved_indicator(frm) {
	frm.page.set_indicator(__("Saved"), "green");
}

function schedule_saved_reassert(frm) {
	const docname = frm.docname;
	LT_REASSERT_DELAYS.forEach((delay) => {
		setTimeout(() => {
			if (!frm.doc || frm.docname !== docname) {
				return;
			}
			if (!frm.__lt_saved || frm.__lt_saved_docname !== docname) {
				return;
			}

			// Give the guard another chance in case the dirty event raced
			maybe_revert(frm);

			if (!frm.is_dirty()) {
				show_saved_indicator(frm);
			}
		}, delay);
	});
}

function stable_str(value) {
	return JSON.stringify(value, function (key, val) {
		return key.indexOf("__") === 0 ? undefined : val;
	});
}

function take_snapshot(doc) {
	return JSON.parse(stable_str(doc));
}

function fetch_expected_age(frm) {
	const docname = frm.docname;

	if (!frm.doc.patient) {
		frm.__lt_expected_age = null;
		return;
	}

	frappe.db.get_value("Patient", frm.doc.patient, "custom_age").then((r) => {
		if (frm.docname !== docname) {
			return; // document switched while fetching
		}
		frm.__lt_expected_age = r && r.message ? r.message.custom_age : null;

		// The age script's own request may have landed first and already
		// dirtied the form - re-check now that we know the expected value.
		maybe_revert(frm);
	});
}

function bind_spurious_dirty_guard(frm) {
	if (frm.__lt_guard_bound) {
		return;
	}
	frm.__lt_guard_bound = true;

	// The toolbar binds its own "dirty" handler when the form is created,
	// so binding here means our handler runs *after* it and can override
	// the "Not Saved" indicator it just set.
	$(frm.wrapper).on("dirty.lab_test_indicator", function () {
		maybe_revert(frm);
	});
}

function maybe_revert(frm) {
	if (!frm.is_dirty()) {
		return;
	}
	if (!is_spurious_age_dirty(frm)) {
		return;
	}
	revert_spurious_dirty(frm);
}

function is_just_saved(frm) {
	return Boolean(
		frm.__lt_saved &&
			frm.__lt_saved_docname === frm.docname &&
			frm.__lt_saved_at &&
			Date.now() - frm.__lt_saved_at < LT_JUST_SAVED_MS
	);
}

function is_spurious_age_dirty(frm) {
	const snap = frm.__lt_snapshot;
	if (!snap || !("patient_age" in snap)) {
		return false;
	}

	const current = frm.doc.patient_age;

	// patient_age itself did not change -> dirty came from somewhere else
	if (stable_str(current) === stable_str(snap.patient_age)) {
		return false;
	}

	const just_saved = is_just_saved(frm);

	// Outside the save window the new value must be exactly Patient.custom_age.
	// A manual edit to any other value must keep showing "Not Saved".
	// (Loose == so null/undefined and "28"/28 compare equal.)
	// Right after a save the age script fires within milliseconds and the
	// expected age may not have been fetched yet, so skip the check there.
	if (!just_saved && current != frm.__lt_expected_age) {
		return false;
	}

	// Everything except patient_age must still match the clean snapshot.
	// Audit fields are ignored: saving updates `modified` while a stale
	// snapshot may still hold the pre-save value. Just after a save (or
	// submit) the server may also flip status/docstatus fields.
	const ignore = just_saved ? LT_AUDIT_KEYS.concat(LT_SUBMIT_KEYS) : LT_AUDIT_KEYS;

	for (const key of Object.keys(snap)) {
		if (key === "patient_age" || ignore.indexOf(key) !== -1) continue;
		if (stable_str(frm.doc[key]) !== stable_str(snap[key])) {
			return false;
		}
	}
	for (const key of Object.keys(frm.doc)) {
		if (key.indexOf("__") === 0 || key === "patient_age" || ignore.indexOf(key) !== -1) {
			continue;
		}
		if (!(key in snap)) {
			return false;
		}
	}
	return true;
}

function revert_spurious_dirty(frm) {
	delete frm.doc.__unsaved;
	$(frm.wrapper).attr("data-state", "clean");

	// Accept the auto-filled value as the new clean baseline
	frm.__lt_snapshot = take_snapshot(frm.doc);

	if (frm.toolbar) {
		// Re-derive the primary action from the now-clean state
		frm.toolbar.set_primary_action();
		// Re-derive the indicator ("Draft"/status) via frappe.get_indicator
		frm.toolbar.set_indicator();
	}

	if (frm.__lt_saved && frm.__lt_saved_docname === frm.docname) {
		show_saved_indicator(frm);
	}
}
