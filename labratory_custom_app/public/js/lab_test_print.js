// Print dialog: choose which lab test templates to include in the printout.
// None selected => print all tests (server-side filter is a no-op in that case).

frappe.ui.form.on("Lab Test", {
	onload(frm) {
		if (frm._lab_test_print_hooked) return;
		frm._lab_test_print_hooked = true;

		const original_print_doc = frm.print_doc.bind(frm);
		frm.print_doc = function () {
			show_lab_test_print_selection(frm, original_print_doc);
		};
	},
});

function get_lab_test_print_templates(frm) {
	const names = [];
	const add = (name) => {
		if (name && !names.includes(name)) names.push(name);
	};

	(frm.doc.custom_lab_test || []).forEach((row) => add(row.lab_test));
	[
		"normal_test_items",
		"descriptive_test_items",
		"organism_test_items",
		"sensitivity_test_items",
	].forEach((table) => {
		(frm.doc[table] || []).forEach((row) => add(row.template));
	});
	add(frm.doc.template);

	return names;
}

function show_lab_test_print_selection(frm, proceed) {
	const template_names = get_lab_test_print_templates(frm);

	if (template_names.length < 2) {
		proceed();
		return;
	}

	const stored = (frm.doc.custom_selected_print_templates || "")
		.split(",")
		.map((s) => s.trim())
		.filter((name) => name && template_names.includes(name));

	frappe.db
		.get_list("Lab Test Template", {
			filters: { name: ["in", template_names] },
			fields: ["name", "lab_test_name"],
			limit_page_length: template_names.length + 10,
		})
		.then((rows) => {
			const labels = {};
			(rows || []).forEach((row) => {
				if (row.lab_test_name) labels[row.name] = row.lab_test_name;
			});
			open_lab_test_print_dialog(frm, template_names, labels, stored, proceed);
		})
		.catch(() => open_lab_test_print_dialog(frm, template_names, {}, stored, proceed));
}

function open_lab_test_print_dialog(frm, template_names, labels, stored, proceed) {
	const fields = [
		{
			fieldtype: "HTML",
			fieldname: "hint",
		},
	];

	template_names.forEach((name, i) => {
		fields.push({
			fieldtype: "Check",
			fieldname: "tpl_" + i,
			label: labels[name] || name,
			default: stored.includes(name) ? 1 : 0,
		});
	});

	const dialog = new frappe.ui.Dialog({
		title: __("Select Tests to Print"),
		fields: fields,
		primary_action_label: __("Print"),
		primary_action() {
			const selected = [];
			template_names.forEach((name, i) => {
				if (dialog.get_value("tpl_" + i)) selected.push(name);
			});
			dialog.disable_primary_action();
			persist_and_print(frm, selected, dialog, proceed);
		},
		secondary_action_label: __("Cancel"),
		secondary_action() {
			dialog.hide();
		},
	});

	dialog.fields_dict.hint.$wrapper.html(
		`<p class="text-muted small" style="margin-bottom: 12px;">${__(
			"Select the tests to include in this print. Leave all unselected to print every test."
		)}</p>`
	);

	dialog.show();
}

function persist_and_print(frm, selected, dialog, proceed) {
	const value = selected.join(",");

	// client-side value so the print preview (which renders this doc) filters too
	frm.doc.custom_selected_print_templates = value;

	if (frm.doc.__islocal) {
		dialog.hide();
		proceed();
		return;
	}

	frappe.xcall("someshwara_hospital.api.lab_test_print.set_print_templates", {
		name: frm.doc.name,
		templates: value,
	})
		.then(() => {
			dialog.hide();
			proceed();
		})
		.catch((err) => {
			dialog.enable_primary_action();
			frappe.msgprint({
				title: __("Unable to prepare print"),
				message:
					(typeof err === "string" && err) ||
					(err && err.message) ||
					__("Could not save the print selection. Please try again."),
				indicator: "red",
			});
		});
}
