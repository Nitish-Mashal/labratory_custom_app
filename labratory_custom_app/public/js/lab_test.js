// Lab Test: keep the header status indicator identical to healthcare.
//
// Frappe derives the form header pill via frappe.get_indicator():
//   - doc.__unsaved set  -> "Not Saved"
//   - docstatus 0        -> "Draft"
//   - docstatus 1        -> status from lab_test_list.js get_indicator
//                           (Completed / Approved / Rejected / Cancelled)
//
// The "Lab Test Age Generate" client script (someshwara_hospital fixture)
// re-fetches Patient.custom_age on every form refresh and calls
// frm.set_value("patient_age", ...). On legacy docs patient_age is NULL in
// the database while custom_age holds e.g. "28", so the form gets re-dirtied
// and the header flips to "Not Saved".
//
// CustomLabTest.validate() now persists patient_age = custom_age, so after a
// save that set_value is a no-op and the doc stays clean. This file only
// guards the remaining pre-save auto-fill race: when the form is dirtied by
// nothing but that auto-filled patient_age, revert it silently and re-derive
// the real indicator through frappe.get_indicator().

frappe.ui.form.on("Lab Test", {
	onload(frm) {
		frm.__lt_snapshot = null;
		frm.__lt_expected_age = undefined;
		frm.__lt_guard_bound = false;
	},

	refresh(frm) {
		if (!frm.doc || frm.doc.__islocal) {
			return;
		}

		if (!frm.is_dirty()) {
			frm.__lt_snapshot = take_snapshot(frm.doc);
			fetch_expected_age(frm);
		} else {
			// The dirty event may have raced the guard binding - re-check
			maybe_revert(frm);
		}

		bind_spurious_dirty_guard(frm);
	},
});

// Leaving the form page: a later reopen must start from a clean slate
$(document).on("form-unload.lab_test_indicator", function (e, form) {
	if (form && form.doctype === "Lab Test") {
		form.__lt_snapshot = null;
		form.__lt_expected_age = undefined;
		form.__lt_guard_bound = false;
	}
});

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

	frappe.db
		.get_value("Patient", frm.doc.patient, "custom_age")
		.then((r) => {
			if (frm.docname !== docname) {
				return; // document switched while fetching
			}
			frm.__lt_expected_age = r && r.message ? r.message.custom_age : null;

			// The age script's own request may have landed first and already
			// dirtied the form - re-check now that we know the expected value.
			maybe_revert(frm);
		})
		.catch(() => {
			if (frm.docname === docname) {
				frm.__lt_expected_age = null;
			}
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

	// The new value must be exactly Patient.custom_age. A manual edit to any
	// other value must keep showing "Not Saved".
	// (Loose == so null/undefined and "28"/28 compare equal.)
	// If the expected age has not been fetched yet, do not guess.
	if (frm.__lt_expected_age === undefined) {
		return false;
	}
	if (current != frm.__lt_expected_age) {
		return false;
	}

	// Everything except patient_age must still match the clean snapshot.
	// Audit fields are ignored: a stale snapshot may still hold pre-save
	// values while `modified` has already moved on.
	for (const key of Object.keys(snap)) {
		if (key === "patient_age" || key === "modified" || key === "modified_by") {
			continue;
		}
		if (stable_str(frm.doc[key]) !== stable_str(snap[key])) {
			return false;
		}
	}
	for (const key of Object.keys(frm.doc)) {
		if (
			key.indexOf("__") === 0 ||
			key === "patient_age" ||
			key === "modified" ||
			key === "modified_by"
		) {
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
		// Re-derive the indicator (Draft / Completed / ...) via frappe.get_indicator
		frm.toolbar.set_indicator();
	}
}
