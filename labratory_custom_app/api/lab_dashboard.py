import frappe
from frappe.utils import today


# ============================================================
# MAIN DASHBOARD API
# ============================================================

@frappe.whitelist()
def get_dashboard_data(from_date=None, to_date=None):

    from_date = from_date or today()
    to_date = to_date or today()

    from_datetime = f"{from_date} 00:00:00"
    to_datetime = f"{to_date} 23:59:59"

    # ========================================================
    # SUMMARY
    # ========================================================

    summary = {

        # ----------------------------------------------------
        # LAB TESTS
        # ----------------------------------------------------

        "total_lab_tests": get_date_count(
            "Lab Test",
            "date",
            from_date,
            to_date
        ),

        # ----------------------------------------------------
        # SAMPLE COLLECTION
        # ----------------------------------------------------

        "total_samples": get_date_count(
            "Sample Collection",
            "collected_time",
            from_datetime,
            to_datetime
        ),

        # ----------------------------------------------------
        # PATIENTS
        # ----------------------------------------------------

        "total_patients": frappe.db.count(
            "Patient"
        ),

        # ----------------------------------------------------
        # SALES INVOICES
        # ----------------------------------------------------

        "total_sales_invoices": get_date_count(
            "Sales Invoice",
            "posting_date",
            from_date,
            to_date
        ),

        # ----------------------------------------------------
        # PAID AMOUNT
        # ----------------------------------------------------

        "total_paid_amount": get_sales_invoice_paid_amount(
            from_date,
            to_date
        )
    }

    # ========================================================
    # LAB TEST STATUS
    # ONLY DRAFT + COMPLETED
    # ========================================================

    lab_tests = get_status_data(
        doctype="Lab Test",
        date_field="date",
        from_date=from_date,
        to_date=to_date,
        allowed_statuses=[
            "Draft",
            "Completed"
        ]
    )

    # ========================================================
    # SAMPLE COLLECTION STATUS
    # ========================================================

    sample_collection = get_status_data(
        doctype="Sample Collection",
        date_field="collected_time",
        from_date=from_datetime,
        to_date=to_datetime
    )

    # ========================================================
    # SALES INVOICE STATUS
    # ========================================================

    sales_invoices = get_status_data(
        doctype="Sales Invoice",
        date_field="posting_date",
        from_date=from_date,
        to_date=to_date
    )

    # ========================================================
    # RECENT LAB TESTS
    # ASCENDING ORDER
    # ========================================================

    recent_lab_tests = get_recent_lab_tests(
        from_date,
        to_date
    )

    # ========================================================
    # RECENT SALES INVOICES
    # ========================================================

    recent_sales_invoices = get_recent_sales_invoices(
        from_date,
        to_date
    )

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "success": True,

        "filters": {
            "from_date": from_date,
            "to_date": to_date
        },

        "summary": summary,

        "lab_tests": lab_tests,

        "sample_collection": sample_collection,

        "sales_invoices": sales_invoices,

        "recent_lab_tests": recent_lab_tests,

        "recent_sales_invoices": recent_sales_invoices
    }


# ============================================================
# GENERIC DATE COUNT
# ============================================================

def get_date_count(
    doctype,
    date_field,
    from_date,
    to_date
):

    meta = frappe.get_meta(
        doctype
    )

    field = meta.get_field(
        date_field
    )

    if not field:
        return 0

    # --------------------------------------------------------
    # DATE FIELD
    # --------------------------------------------------------

    if field.fieldtype == "Date":

        filters = {
            date_field: [
                "between",
                [
                    from_date,
                    to_date
                ]
            ]
        }

    # --------------------------------------------------------
    # DATETIME FIELD
    # --------------------------------------------------------

    elif field.fieldtype == "Datetime":

        filters = {
            date_field: [
                "between",
                [
                    from_date,
                    to_date
                ]
            ]
        }

    else:

        return 0

    return frappe.db.count(
        doctype,
        filters=filters
    )


# ============================================================
# SALES INVOICE PAID AMOUNT
# ============================================================

def get_sales_invoice_paid_amount(
    from_date,
    to_date
):

    result = frappe.db.sql(
        """
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN docstatus = 1
                        THEN
                            COALESCE(grand_total, 0)
                            -
                            COALESCE(outstanding_amount, 0)
                        ELSE 0
                    END
                ),
                0
            ) AS total_paid

        FROM `tabSales Invoice`

        WHERE posting_date BETWEEN
            %(from_date)s
            AND %(to_date)s
        """,
        {
            "from_date": from_date,
            "to_date": to_date
        },
        as_dict=True
    )

    if not result:
        return 0

    return float(
        result[0].total_paid or 0
    )


# ============================================================
# GENERIC STATUS DATA
# ============================================================

def get_status_data(
    doctype,
    date_field=None,
    from_date=None,
    to_date=None,
    allowed_statuses=None
):

    meta = frappe.get_meta(
        doctype
    )

    status_field = meta.get_field(
        "status"
    )

    if not status_field:

        return {
            "doctype": doctype,
            "total": 0,
            "statuses": []
        }

    # ========================================================
    # GET STATUS OPTIONS FROM DOCTYPE
    # ========================================================

    options = []

    if status_field.options:

        options = [
            option.strip()
            for option in status_field.options.splitlines()
            if option.strip()
        ]

    # ========================================================
    # FILTER STATUS OPTIONS
    # ========================================================

    if allowed_statuses is not None:

        options = [
            option
            for option in options
            if option in allowed_statuses
        ]

    # ========================================================
    # DATE FILTER
    # ========================================================

    filters = {}

    if date_field:

        date_meta = meta.get_field(
            date_field
        )

        if date_meta:

            # ------------------------------------------------
            # DATE
            # ------------------------------------------------

            if date_meta.fieldtype == "Date":

                filters[date_field] = [
                    "between",
                    [
                        from_date,
                        to_date
                    ]
                ]

            # ------------------------------------------------
            # DATETIME
            # ------------------------------------------------

            elif date_meta.fieldtype == "Datetime":

                filters[date_field] = [
                    "between",
                    [
                        from_date,
                        to_date
                    ]
                ]

    # ========================================================
    # TOTAL
    # ========================================================

    total = frappe.db.count(
        doctype,
        filters=filters
    )

    # ========================================================
    # STATUS COUNTS
    # ========================================================

    status_result = []

    for status in options:

        count_filters = dict(
            filters
        )

        count_filters["status"] = status

        count = frappe.db.count(
            doctype,
            filters=count_filters
        )

        status_result.append({

            "label": status,

            "value": status,

            "count": count
        })

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "doctype": doctype,

        "total": total,

        "statuses": status_result
    }


# ============================================================
# RECENT LAB TESTS
# ASCENDING ORDER
# ============================================================

def get_recent_lab_tests(
    from_date=None,
    to_date=None
):

    filters = {

        "date": [
            "between",
            [
                from_date,
                to_date
            ]
        ]
    }

    records = frappe.get_all(
        "Lab Test",

        filters=filters,

        fields=[
            "name",
            "patient",
            "patient_name",
            "status",
            "date"
        ],

        # ----------------------------------------------------
        # ASCENDING:
        # OLDEST DATE FIRST
        # ----------------------------------------------------

        order_by=(
            "date asc, "
            "creation asc"
        ),

        limit_page_length=10
    )

    result = []

    for row in records:

        result.append({

            "name": row.name,

            "patient": row.patient,

            "patient_name": row.patient_name,

            "status": row.status,

            "date": row.date
        })

    return result


# ============================================================
# RECENT SALES INVOICES
# ============================================================

def get_recent_sales_invoices(
    from_date=None,
    to_date=None
):

    filters = {

        "posting_date": [
            "between",
            [
                from_date,
                to_date
            ]
        ]
    }

    records = frappe.get_all(
        "Sales Invoice",

        filters=filters,

        fields=[
            "name",
            "posting_date",
            "customer",
            "customer_name",
            "status",
            "grand_total",
            "outstanding_amount",
            "currency",
            "docstatus"
        ],

        order_by=(
            "posting_date desc, "
            "creation desc"
        ),

        limit_page_length=10
    )

    result = []

    for row in records:

        # ----------------------------------------------------
        # CALCULATE PAID AMOUNT
        # ----------------------------------------------------

        if row.docstatus == 1:

            paid_amount = (
                float(row.grand_total or 0)
                -
                float(row.outstanding_amount or 0)
            )

        else:

            paid_amount = 0

        result.append({

            "name": row.name,

            "posting_date": row.posting_date,

            "customer": row.customer,

            "customer_name": row.customer_name,

            "status": row.status,

            "grand_total": float(
                row.grand_total or 0
            ),

            "paid_amount": paid_amount,

            "currency": row.currency,

            "docstatus": row.docstatus
        })

    return result