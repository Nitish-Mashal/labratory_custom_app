frappe.pages['lab_dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Lab Dashboard',
		single_column: true
	});
}