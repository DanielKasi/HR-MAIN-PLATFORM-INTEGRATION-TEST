from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import (
    extend_schema,
    OpenApiResponse,
    OpenApiExample,
    OpenApiParameter,
)
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from datetime import datetime, date
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from .serializers import (
    ReportChoicesSerializer,
    ReportGenerateInputSerializer,
)
import pytz
from reportlab.lib.enums import TA_CENTER
import openpyxl
from reportlab.lib.pagesizes import A4, landscape, letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib.units import inch
from .registry import (
    generate_institution_reports,
    get_report_config,
    build_reports_registry,
)


def normalize_report_data(data):
    """Convert .values() queryset to list of dicts if needed."""
    if hasattr(data, "iterator"):  # It's a queryset
        return list(data)
    return data


class ReportChoicesView(APIView):
    @extend_schema(
        tags=["Reports"],
        description="Get available report types for a specific app (e.g., recruitment).",
        parameters=[
            {
                "name": "app",
                "in": "query",
                "required": True,
                "description": 'App name (e.g., "recruitment")',
                "schema": {
                    "type": "string",
                    "enum": list(build_reports_registry().keys()),
                },  # Dynamic enum
            }
        ],
        responses={
            200: OpenApiResponse(
                response=ReportChoicesSerializer,
                description="List of report types.",
                examples=[
                    OpenApiExample(
                        "Recruitment Example",
                        value={
                            "report_types": ["candidates", "interviews", "onboardings"]
                        },
                        summary="Available types for recruitment app.",
                    )
                ],
            ),
            400: OpenApiResponse(description="Invalid or missing 'app' parameter."),
        },
    )
    def get(self, request):
        app_name = request.query_params.get("app")
        if not app_name:
            return Response(
                {"error": 'Missing "app" parameter'}, status=status.HTTP_400_BAD_REQUEST
            )

        all_reports = build_reports_registry()
        if app_name not in all_reports:
            available = list(all_reports.keys())
            return Response(
                {"error": f"Invalid app: '{app_name}'. Available: {available}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        choices = list(all_reports[app_name].keys())
        serializer = ReportChoicesSerializer({"report_types": choices})
        return Response(serializer.data)


class ReportGenerateView(APIView):
    @extend_schema(
        tags=["Reports"],
        description="Generate a report (Excel or PDF) filtered by date range and institution. All params required. Optional filters can be added as query parameters (e.g., &status=active&department__id=1).",
        parameters=[
            OpenApiParameter(
                name="app",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='App name (e.g., "recruitment"). Omit to generate reports for all apps.',
                required=False,
            ),
            OpenApiParameter(
                name="report_type",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Report type (e.g., "onboardings"). Required if app is specified.',
                required=False,
            ),
            OpenApiParameter(
                name="start_date",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Start date (YYYY-MM-DD)",
                required=True,
            ),
            OpenApiParameter(
                name="end_date",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="End date (YYYY-MM-DD)",
                required=True,
            ),
            OpenApiParameter(
                name="format_type",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Output format",
                required=True,
                enum=["excel", "pdf"],
            ),
            OpenApiParameter(
                name="[filter_field]",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Optional filter fields using Django lookup syntax (e.g., status=active, department__name=HR)",
                required=False,
            ),
        ],
        responses={
            200: OpenApiResponse(description="Generated report file (Excel or PDF)."),
            400: OpenApiResponse(
                description="Validation error (e.g., invalid params/dates)."
            ),
            204: OpenApiResponse(description="No data found."),
            500: OpenApiResponse(description="Generation failed."),
        },
    )
    def get(self, request):
        serializer = ReportGenerateInputSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        # Use validated_data
        data = serializer.validated_data
        app_name = data.get("app")  # Optional
        report_type = data.get("report_type")  # Optional
        start_date = data["start_date"]
        end_date = data["end_date"]
        format_type = data["format_type"]

        # Get institution from user profile
        try:
            institution = request.user.profile.institution
        except AttributeError:
            return Response(
                {"error": "User profile or institution not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect optional filters from query params
        reserved_keys = ["app", "report_type", "start_date", "end_date", "format_type"]
        filters = {
            k: request.query_params[k]
            for k in request.query_params
            if k not in reserved_keys
        }

        # Convert dates to datetime if needed
        if isinstance(start_date, date):
            start_date = datetime.combine(start_date, datetime.min.time())
        if isinstance(end_date, date):
            end_date = datetime.combine(end_date, datetime.max.time())

        try:
            if app_name and report_type:
                # Single report generation
                model_class = get_report_config(app_name, report_type)
                raw_data = model_class.get_report_data(
                    start_date, end_date, institution, **filters
                )
                report_data = {f"{app_name}_{report_type}": raw_data}
            else:
                # Generate reports for all apps or specified app
                report_data = generate_institution_reports(
                    start_date, end_date, institution, app_name, **filters
                )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Report generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Check if there's any data
        has_data = any(
            data_list
            for data_list in report_data.values()
            if isinstance(data_list, list)
        )
        if not has_data:
            return Response(
                {"error": "No data found for the selected period"},
                status=status.HTTP_204_NO_CONTENT,
            )

        # Generate filename prefix
        filename_prefix = (
            f"{app_name}_{report_type}"
            if app_name and report_type
            else "institution_report"
        )

        if format_type == "excel":
            return self.generate_excel(report_data, filename_prefix)
        elif format_type == "pdf":
            return self.generate_pdf(report_data, filename_prefix)
        else:
            return Response(
                {"error": "Invalid format"}, status=status.HTTP_400_BAD_REQUEST
            )

    def generate_excel(self, report_data, filename_prefix):
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            for report_name, data in report_data.items():
                if data:  # Only create a sheet if there's data
                    cleaned_data = []
                    for row in data:
                        cleaned_row = {}
                        for key, value in row.items():
                            if isinstance(value, datetime) and value.tzinfo is not None:
                                cleaned_row[key] = value.replace(tzinfo=None)
                            else:
                                cleaned_row[key] = value
                        cleaned_data.append(cleaned_row)
                    df = pd.DataFrame(cleaned_data)

                    # Custom mapping for shortened, keyword-based headers (same as PDF)
                    header_mapping = {
                        "applicant_name": "Applicant",
                        "applicant_email": "Email",
                        "applicant_phone": "Phone",
                        "application_date": "Date",
                        "status": "Status",
                        "gender": "Gender",
                        "source": "Source",
                        "country": "Country",
                        "job_position_advert__job_position__name": "Job Position",
                        "docs_count": "Docs",
                        "skill_zone": "Skills",
                        # Add more mappings based on your data
                    }
                    humanized_columns = {
                        col: header_mapping.get(
                            col.lower(),
                            col.replace("_", " ")
                            .replace("__", " ")
                            .title()
                            .split()[-1],
                        )
                        for col in df.columns
                    }
                    df = df.rename(columns=humanized_columns)

                    # Write to Excel with formatting
                    sheet_name = report_name[:31]  # Excel sheet name limit
                    df.to_excel(writer, sheet_name=sheet_name, index=False)

                    # Apply styles using openpyxl
                    worksheet = writer.sheets[sheet_name]
                    header_row = worksheet[1]  # Row 1 is header (0-based index)
                    for cell in header_row:
                        cell.fill = openpyxl.styles.PatternFill(
                            start_color="4F81BD", end_color="4F81BD", fill_type="solid"
                        )
                        cell.font = openpyxl.styles.Font(bold=True, color="FFFFFF")
                    # Auto-adjust column widths
                    for column in df.columns:
                        max_length = (
                            max(df[column].astype(str).str.len().max(), len(column)) + 2
                        )  # Add padding
                        column_letter = openpyxl.utils.get_column_letter(
                            df.columns.get_loc(column) + 1
                        )
                        worksheet.column_dimensions[column_letter].width = min(
                            max_length, 50
                        )

        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            f"attachment; filename={filename_prefix}_report.xlsx"
        )
        return response

    def generate_pdf(self, report_data, filename_prefix):
        buffer = BytesIO()
        styles = getSampleStyleSheet()
        center_style = styles["Heading1"]
        center_style.alignment = TA_CENTER

        # Determine max columns to decide orientation
        max_columns = max(
            len(data[0]) if data else 0 for data in report_data.values() if data
        )
        if max_columns > 6:
            pagesize = landscape(letter)
            page_width = 11 * inch
        else:
            pagesize = letter
            page_width = 8.5 * inch

        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            leftMargin=0.5 * inch,
            rightMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
        )
        elements = []

        for report_name, data in report_data.items():
            if not data:
                continue

            # Humanized report title, centered
            humanized_title = (
                report_name.replace("_", " ").replace("Mgt", "Management").title()
            )
            elements.append(Paragraph(f"<b>{humanized_title} Report</b>", center_style))
            elements.append(Spacer(1, 12))

            # Prepare data for table
            headers = list(data[0].keys())
            # Custom mapping for shortened, keyword-based headers
            header_mapping = {
                "applicant_name": "Applicant",
                "applicant_email": "Email",
                "applicant_phone": "Phone",
                "application_date": "Date",
                "status": "Status",
                "gender": "Gender",
                "source": "Source",
                "country": "Country",
                "job_position_advert__job_position__name": "Job Position",
                "docs_count": "Docs",
                "skill_zone": "Skills",
                # Add more mappings based on your data
            }
            humanized_headers = [
                header_mapping.get(
                    h.lower(),
                    h.replace("_", " ").replace("__", " ").title().split()[-1],
                )
                for h in headers
            ]
            table_data = [humanized_headers]

            # Calculate dynamic column widths
            col_widths = []
            for i, header in enumerate(headers):
                max_length = (
                    max(len(str(row.get(header, ""))) for row in data)
                    if data
                    else len(humanized_headers[i])
                )
                col_width = min(
                    max(0.6 * inch, (max_length * 6) / 72 * inch),
                    (page_width - inch) / max_columns,
                )  # Cap width
                col_widths.append(col_width)

            for row in data:
                table_row = []
                for value in row.values():
                    if isinstance(value, datetime):
                        text = value.strftime("%B %d, %Y %H:%M:%S")
                    elif isinstance(value, date):
                        text = value.strftime("%B %d, %Y")
                    else:
                        text = str(value)
                    # Wrap long text
                    wrapped_text = "\n".join(
                        text[i : i + 15] for i in range(0, len(text), 15)
                    )
                    table_row.append(wrapped_text)
                table_data.append(table_row)

            # Create table with dynamic widths
            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 1), (-1, -1), 8),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("WORDWRAP", (0, 0), (-1, -1), "CJK"),
                    ]
                )
            )
            elements.append(table)
            elements.append(Spacer(1, 24))
            elements.append(PageBreak())

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename={filename_prefix}_report.pdf"
        )
        return response
