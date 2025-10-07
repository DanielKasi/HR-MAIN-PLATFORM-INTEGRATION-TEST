from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, OpenApiParameter
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
from .registry import generate_institution_reports, get_report_config, build_reports_registry


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
                name='app',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='App name (e.g., "recruitment"). Omit to generate reports for all apps.',
                required=False,
            ),
            OpenApiParameter(
                name='report_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Report type (e.g., "onboardings"). Required if app is specified.',
                required=False,
            ),
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='Start date (YYYY-MM-DD)',
                required=True,
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description='End date (YYYY-MM-DD)',
                required=True,
            ),
            OpenApiParameter(
                name='format_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Output format',
                required=True,
                enum=['excel', 'pdf'],
            ),
            OpenApiParameter(
                name='[filter_field]',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Optional filter fields using Django lookup syntax (e.g., status=active, department__name=HR)',
                required=False,
            ),
        ],
        responses={
            200: OpenApiResponse(description="Generated report file (Excel or PDF)."),
            400: OpenApiResponse(description="Validation error (e.g., invalid params/dates)."),
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
                status=status.HTTP_400_BAD_REQUEST
            )

        # Collect optional filters from query params
        reserved_keys = ['app', 'report_type', 'start_date', 'end_date', 'format_type']
        filters = {k: request.query_params[k] for k in request.query_params if k not in reserved_keys}

        # Convert dates to datetime if needed
        if isinstance(start_date, date):
            start_date = datetime.combine(start_date, datetime.min.time())
        if isinstance(end_date, date):
            end_date = datetime.combine(end_date, datetime.max.time())

        try:
            if app_name and report_type:
                # Single report generation
                model_class = get_report_config(app_name, report_type)
                raw_data = model_class.get_report_data(start_date, end_date, institution, **filters)
                report_data = {f"{app_name}_{report_type}": raw_data}
            else:
                # Generate reports for all apps or specified app
                report_data = generate_institution_reports(start_date, end_date, institution, app_name, **filters)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Report generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Check if there's any data
        has_data = any(data_list for data_list in report_data.values() if isinstance(data_list, list))
        if not has_data:
            return Response({"error": "No data found for the selected period"}, status=status.HTTP_204_NO_CONTENT)

        # Generate filename prefix
        filename_prefix = f"{app_name}_{report_type}" if app_name and report_type else "institution_report"

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
                    df = pd.DataFrame(data)
                    sheet_name = report_name[:31]  # Excel sheet name limit
                    df.to_excel(writer, index=False, sheet_name=sheet_name)
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
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        y = height - 50
        for report_name, data in report_data.items():
            if not data:
                continue

            p.drawString(100, y, f'{report_name.replace("_", " ").title()} Report')
            y -= 20

            headers = list(data[0].keys()) if data else []
            col_width = width / max(1, len(headers))
            for i, header in enumerate(headers):
                p.drawString(50 + i * col_width, y, str(header))
            y -= 20

            for row in data:
                for i, value in enumerate(row.values()):
                    text = str(value)[:30] + "..." if len(str(value)) > 30 else str(value)
                    p.drawString(50 + i * col_width, y, text)
                y -= 20
                if y < 50:
                    p.showPage()
                    y = height - 50

            p.showPage()
            y = height - 50

        p.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename={filename_prefix}_report.pdf"
        )
        return response
