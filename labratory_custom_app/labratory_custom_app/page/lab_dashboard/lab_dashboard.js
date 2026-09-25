frappe.pages["lab_dashboard"].on_page_load = function (wrapper) {

    frappe.ui.make_app_page({
        parent: wrapper,
        title: "Lab Dashboard",
        single_column: true
    });

};


// ==================================================
// PAGE SHOW
// ==================================================

frappe.pages["lab_dashboard"].on_page_show = function (wrapper) {

    // Give Frappe time to finish rendering
    setTimeout(function () {

        if (
            window.mountLabDashboardFromFrappe
        ) {

            window.mountLabDashboardFromFrappe(
                wrapper
            );

        }

    }, 100);

};