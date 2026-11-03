import frappe

STALE_MODULE_NAME = "labratory-custom-app"


def ensure_module_defs(app_name="labratory_custom_app"):
    """Create a Module Def for every module listed in the app's modules.txt.

    Frappe creates module defs during `install-app`, this keeps it guaranteed
    even if the app was installed before the module was renamed or the record
    was removed. Safe to run any number of times.
    """
    for module in frappe.get_module_list(app_name) or [app_name]:
        if frappe.db.exists("Module Def", module):
            continue

        module_def = frappe.new_doc("Module Def")
        module_def.module_name = module
        module_def.app_name = app_name
        module_def.flags.ignore_permissions = True
        module_def.insert(ignore_if_duplicate=True)

    remove_stale_module_def(app_name)


def remove_stale_module_def(app_name="labratory_custom_app"):
    """Drop the pre-rename Module Def (`labratory-custom-app`) when unreferenced."""
    if not frappe.db.exists("Module Def", STALE_MODULE_NAME):
        return

    referenced = any(
        frappe.db.exists(doctype, {"module": STALE_MODULE_NAME})
        for doctype in (
            "DocType",
            "Page",
            "Workspace",
            "Dashboard",
            "Report",
            "Print Format",
            "Custom Field",
            "Property Setter",
            "Client Script",
            "Number Card",
        )
    )
    if referenced:
        return

    frappe.delete_doc(
        "Module Def",
        STALE_MODULE_NAME,
        ignore_permissions=True,
        force=True,
        ignore_missing=True,
    )


def after_install():
    ensure_module_defs()
    frappe.clear_cache()
    print("labratory_custom_app installed successfully.")


def after_migrate():
    ensure_module_defs()
    frappe.clear_cache()
