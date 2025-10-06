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
from .registry import get_report_config, build_reports_registry


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
        description="Generate a report (Excel or PDF) filtered by date range. All params required.",
        parameters=[
            OpenApiParameter(
                name='app',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='App name (e.g., "recruitment")',
                required=True,
            ),
            OpenApiParameter(
                name='report_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Report type (e.g., "onboardings")',
                required=True,
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
        app_name = data["app"]
        report_type = data["report_type"]
        start_date = data["start_date"]
        end_date = data["end_date"]
        format_type = data["format_type"]  # This matches your serializer field name

        try:
            model_class = get_report_config(app_name, report_type)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Convert dates if needed
        if isinstance(start_date, date):
            start_date = datetime.combine(start_date, datetime.min.time())
        if isinstance(end_date, date):
            end_date = datetime.combine(end_date, datetime.max.time())

        try:
            raw_data = model_class.get_report_data(start_date, end_date)
            report_data = normalize_report_data(raw_data)
        except Exception as e:
            return Response(
                {"error": f"Report generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not report_data:
            return HttpResponse("No data found for the selected period", status=204)

        filename_prefix = f"{app_name}_{report_type}"
        
        if format_type == "excel":
            return self.generate_excel(report_data, filename_prefix)
        elif format_type == "pdf":
            return self.generate_pdf(report_data, filename_prefix)
        else:
            return Response(
                {"error": "Invalid format"}, status=status.HTTP_400_BAD_REQUEST
            )

    def generate_excel(self, data, filename_prefix):
        df = pd.DataFrame(data)
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Report")
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            f"attachment; filename={filename_prefix}_report.xlsx"
        )
        return response

    def generate_pdf(self, data, filename_prefix):
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        p.drawString(
            100, height - 50, f'{filename_prefix.replace("_", " ").title()} Report'
        )

        y = height - 120
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

        p.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename={filename_prefix}_report.pdf"
        )
        return response
