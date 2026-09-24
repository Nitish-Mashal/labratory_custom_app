import re
import frappe

import healthcare.healthcare.doctype.lab_test.lab_test as lab_test_module
from healthcare.healthcare.doctype.lab_test.lab_test import (
    LabTest,
    create_lab_test_doc,
    get_lab_test_template,
    load_result_format,
    create_compounds,
    create_normals,
    create_descriptives,
    create_imaging,
)


def create_lab_test_from_invoice(sales_invoice):
    invoice = frappe.get_doc("Sales Invoice", sales_invoice)
    if not invoice or not invoice.patient:
        return False

    patient = frappe.get_doc("Patient", invoice.patient)
    pending_items = []

    for item in invoice.items:
        if item.reference_dt == "Service Request":
            continue
        if item.reference_dt == "Lab Test":
            continue

        template = get_lab_test_template(item.item_code)
        if template:
            pending_items.append((item, template))

    if not pending_items:
        return False

    first_item, first_template = pending_items[0]
    lab_test = create_lab_test_doc(
        invoice.ref_practitioner,
        patient,
        first_template,
        invoice.company,
        True,
        first_item.service_unit,
    )

    for item, template in pending_items:
        template_names = frappe.get_all(
            "Lab Test Template",
            filters={"item": item.item_code},
            pluck="name",
            order_by="creation asc",
        )
        for template_name in template_names:
            lab_test.append("custom_lab_test", {"lab_test": template_name})

    lab_test.save(ignore_permissions=True)

    for item, _template in pending_items:
        if item.reference_dt != "Service Request":
            frappe.db.set_value(
                "Sales Invoice Item",
                item.name,
                {"reference_dt": "Lab Test", "reference_dn": lab_test.name},
            )

    return lab_test.name


lab_test_module.create_lab_test_from_invoice = create_lab_test_from_invoice


class CustomLabTest(LabTest):

    def load_invoice_templates(self):
        if not self.invoiced or not self.template or self.custom_lab_test:
            return

        template_item = frappe.db.get_value(
            "Lab Test Template", self.template, "item"
        )
        if not template_item:
            return

        template_names = frappe.get_all(
            "Lab Test Template",
            filters={"item": template_item},
            pluck="name",
            order_by="creation asc",
        )

        for template_name in template_names:
            self.append("custom_lab_test", {"lab_test": template_name})

    def sync_new_templates(self):
        """Append newly selected templates into normal_test_items."""

        if not self.custom_lab_test:
            return

        # Templates already loaded
        loaded_templates = {
            row.template
            for row in self.normal_test_items
            if row.template
        }

        for child in self.custom_lab_test:

            if child.lab_test in loaded_templates:
                continue

            template = frappe.get_doc("Lab Test Template", child.lab_test)

            before = len(self.normal_test_items)

            if template.lab_test_template_type == "Compound":
                create_compounds(template, self, False)

            elif template.lab_test_template_type == "Single":
                create_normals(template, self)

            elif template.lab_test_template_type == "Descriptive":
                create_descriptives(template, self)

            elif template.lab_test_template_type == "Imaging":
                create_imaging(template, self)

            # Tag newly added rows
            for row in self.normal_test_items[before:]:
                row.custom_test_group = template.lab_test_name

            loaded_templates.add(template.name)

    def remove_deselected_template_rows(self):
        if not self.custom_lab_test:
            return

        selected_templates = {
            child.lab_test for child in self.custom_lab_test if child.lab_test
        }

        self.normal_test_items = [
            row
            for row in self.normal_test_items
            if not row.template or row.template in selected_templates
        ]
        self.descriptive_test_items = [
            row
            for row in self.descriptive_test_items
            if not row.template or row.template in selected_templates
        ]

    def validate(self):

        self.load_invoice_templates()

        self.remove_deselected_template_rows()

        if self.custom_lab_test:
            self.template = self.custom_lab_test[0].lab_test

        super().validate()

        # Only when editing an existing Lab Test
        if not self.is_new():
            self.sync_new_templates()

        self.set_reference_range()

    def after_insert(self):
        """
        Healthcare loads only the first template automatically.
        Load the remaining templates.
        """

        super().after_insert()

        if not self.custom_lab_test:
            return

        first_template = frappe.get_doc(
            "Lab Test Template",
            self.custom_lab_test[0].lab_test
        )

        # Tag first template rows
        for row in self.normal_test_items:
            if not row.custom_test_group:
                row.custom_test_group = first_template.lab_test_name

        # Load remaining templates
        self.sync_new_templates()

        self.set_reference_range()

        self.save(ignore_permissions=True)


    # -------------------------------------------------------
    # Reference Range
    # -------------------------------------------------------

    def set_reference_range(self):

        if not self.patient:
            return

        age = frappe.db.get_value(
            "Patient",
            self.patient,
            "custom_age"
        )

        gender = (self.patient_sex or "").strip().lower()

        if age is None or not gender:
            return

        try:
            age = int(re.search(r"\d+", str(age)).group())
        except Exception:
            return

        for row in self.normal_test_items:

            if not row.normal_range:
                continue

            original = row.normal_range.strip()

            if "|" not in original:
                continue

            selected = None

            for line in original.splitlines():

                line = line.strip()

                if not line:
                    continue

                parts = [p.strip() for p in line.split("|")]

                if len(parts) != 4:
                    continue

                try:
                    from_age = int(parts[0])
                    to_age = int(parts[1])
                except ValueError:
                    continue

                range_gender = parts[2].lower()
                reference_range = parts[3]

                if (
                    from_age <= age <= to_age
                    and (
                        range_gender == "all"
                        or range_gender == gender
                    )
                ):
                    selected = reference_range
                    break

            if selected:
                row.normal_range = selected