import frappe


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


def after_install():
    ensure_module_defs()
    frappe.clear_cache()
    print("labratory_custom_app installed successfully.")
