import re
import frappe

from healthcare.healthcare.doctype.lab_test.lab_test import (
    LabTest,
    load_result_format,
    create_compounds,
    create_normals,
    create_descriptives,
    create_imaging,
)


class CustomLabTest(LabTest):

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

    def validate(self):

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
    # Load newly added templates
    # -------------------------------------------------------

    # def sync_templates(self):

    #     if not self.custom_lab_test:
    #         return

    #     existing_groups = {
    #         row.custom_test_group
    #         for row in self.normal_test_items
    #         if row.custom_test_group
    #     }

    #     for child in self.custom_lab_test:

    #         template = frappe.get_doc(
    #             "Lab Test Template",
    #             child.lab_test
    #         )

    #         # Already loaded
    #         if template.lab_test_name in existing_groups:
    #             continue

    #         before = len(self.normal_test_items)

    #         load_result_format(
    #             self,
    #             template,
    #             False,
    #             self.template,
    #         )

    #         # Tag only newly added rows
    #         for row in self.normal_test_items[before:]:
    #             row.custom_test_group = template.lab_test_name

    #         existing_groups.add(template.lab_test_name)

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