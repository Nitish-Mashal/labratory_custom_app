import frappe
from frappe.utils import today


# MAIN DASHBOARD API

@frappe.whitelist()
def get_dashboard_data(from_date=None, to_date=None):
    """
    Single API for Laboratory Dashboard.

    Reads:
        - Lab Test
        - Sample Collection
        - Observation
        - Diagnostic Report
        - Service Request
        - Patient

    Status options are read directly from the DocType metadata.
    No status values are hardcoded.
    """

    from_date = from_date or today()
    to_date = to_date or today()

   
    # SUMMARY
    
    summary = {
        "total_lab_tests": frappe.db.count("Lab Test"),
        "total_samples": frappe.db.count("Sample Collection"),
        "total_observations": frappe.db.count("Observation"),
        "total_reports": frappe.db.count("Diagnostic Report"),
        "total_service_requests": frappe.db.count("Service Request"),
        "total_patients": frappe.db.count("Patient"),
    }

    # STATUS DATA    

    lab_tests = get_status_data(
        doctype="Lab Test",
        date_field="date",
        from_date=from_date,
        to_date=to_date
    )

    sample_collection = get_status_data(
        doctype="Sample Collection",
        date_field="collected_time",
        from_date=from_date,
        to_date=to_date
    )

    observations = get_status_data(
        doctype="Observation",
        date_field="posting_date",
        from_date=from_date,
        to_date=to_date
    )

    diagnostic_reports = get_status_data(
        doctype="Diagnostic Report",
        date_field="creation",
        from_date=from_date,
        to_date=to_date
    )

 
    # RECENT ORDERS
    recent_orders = get_recent_service_requests(
        from_date,
        to_date
    )


    # RECENT REPORTS


    recent_reports = get_recent_reports(
        from_date,
        to_date
    )

    # RETURN EVERYTHING IN ONE RESPONSE

    return {
        "success": True,

        "filters": {
            "from_date": from_date,
            "to_date": to_date
        },

        "summary": summary,

        "lab_tests": lab_tests,

        "sample_collection": sample_collection,

        "observations": observations,

        "diagnostic_reports": diagnostic_reports,

        "recent_orders": recent_orders,

        "recent_reports": recent_reports
    }


# GENERIC STATUS FUNCTION

def get_status_data(
    doctype,
    date_field=None,
    from_date=None,
    to_date=None
):
    """
    Get status options directly from DocType metadata.

    Example:

    Lab Test:
        Draft
        Completed
        Approved
        Rejected
        Cancelled

    Sample Collection:
        Pending
        Partly Collected
        Collected

    Nothing is manually mapped.
    """

    meta = frappe.get_meta(doctype)

    status_field = meta.get_field("status")

    if not status_field:
        return {
            "doctype": doctype,
            "statuses": []
        }

    # Read status options from DocType

    options = []

    if status_field.options:

        options = [
            option.strip()
            for option in status_field.options.splitlines()
            if option.strip()
        ]

    # Build filters

    filters = {}

    if date_field and from_date and to_date:

        # Check field exists before using it
        if meta.get_field(date_field):

            if date_field == "creation":

                filters["creation"] = [
                    "between",
                    [
                        f"{from_date} 00:00:00",
                        f"{to_date} 23:59:59"
                    ]
                ]

            elif meta.get_field(date_field).fieldtype in [
                "Date",
                "Datetime"
            ]:

                filters[date_field] = [
                    "between",
                    [
                        from_date,
                        to_date
                    ]
                ]

    # Count every status

    status_result = []

    for status in options:

        count_filters = dict(filters)

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

    # Total records in selected date range

    total = frappe.db.count(
        doctype,
        filters=filters
    )

    return {
        "doctype": doctype,
        "total": total,
        "statuses": status_result
    }


# RECENT SERVICE REQUESTS

def get_recent_service_requests(
    from_date=None,
    to_date=None
):

    meta = frappe.get_meta("Service Request")

    filters = {}

    if meta.get_field("order_date"):

        filters["order_date"] = [
            "between",
            [
                from_date,
                to_date
            ]
        ]

    records = frappe.get_all(
        "Service Request",
        filters=filters,
        fields=[
            "name",
            "title",
            "order_date",
            "order_time",
            "status",
            "patient",
            "patient_name",
            "practitioner",
            "practitioner_name",
            "priority",
            "quantity",
            "sample_collection_required"
        ],
        order_by="creation desc",
        limit_page_length=10
    )

    result = []

    for row in records:

        result.append({
            "name": row.name,
            "title": row.title,
            "order_date": row.order_date,
            "order_time": row.order_time,

            "status": get_code_value(row.status),

            "patient": row.patient,
            "patient_name": row.patient_name,

            "practitioner": row.practitioner,
            "practitioner_name": row.practitioner_name,

            "priority": get_code_value(row.priority),

            "quantity": row.quantity,

            "sample_collection_required": (
                bool(row.sample_collection_required)
            )
        })

    return result


# RECENT DIAGNOSTIC REPORTS

def get_recent_reports(
    from_date=None,
    to_date=None
):

    filters = {
        "creation": [
            "between",
            [
                f"{from_date} 00:00:00",
                f"{to_date} 23:59:59"
            ]
        ]
    }

    records = frappe.get_all(
        "Diagnostic Report",
        filters=filters,
        fields=[
            "name",
            "patient",
            "patient_name",
            "status",
            "practitioner",
            "practitioner_name",
            "sample_collection",
            "creation"
        ],
        order_by="creation desc",
        limit_page_length=10
    )

    result = []

    for row in records:

        result.append({
            "name": row.name,

            "patient": row.patient,

            "patient_name": row.patient_name,

            "status": row.status,

            "practitioner": row.practitioner,

            "practitioner_name": row.practitioner_name,

            "sample_collection": row.sample_collection,

            "creation": row.creation
        })

    return result



def get_code_value(value):

    if not value:
        return None

    try:

        result = frappe.db.get_value(
            "Code Value",
            value,
            "display"
        )

        return result or value

    except Exception:

        return value