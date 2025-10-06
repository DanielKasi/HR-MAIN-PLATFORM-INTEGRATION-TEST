from rest_framework import serializers
from datetime import date

class ReportChoicesSerializer(serializers.Serializer):
    """Serializer for the list of available report types per app."""
    report_types = serializers.ListField(
        child=serializers.CharField(),
        help_text="Available report types for the specified app (e.g., ['candidates', 'onboardings'])."
    )

class ReportGenerateInputSerializer(serializers.Serializer):
    """Serializer for generating a report."""
    app = serializers.CharField(
        max_length=50,
        help_text="App name (e.g., 'recruitment', 'assets'). Must have a reports config."
    )
    report_type = serializers.CharField(
        max_length=50,
        help_text="Report type within the app (e.g., 'candidates' for recruitment)."
    )
    start_date = serializers.DateField(
        help_text="Start date for the report period (YYYY-MM-DD)."
    )
    end_date = serializers.DateField(
        help_text="End date for the report period (YYYY-MM-DD). Must be after start_date."
    )
    format_type = serializers.ChoiceField(
        choices=['excel', 'pdf'],
        help_text="Output format: 'excel' for XLSX or 'pdf' for PDF."
    )

    def validate(self, attrs):
        """Custom validation: Ensure end_date > start_date."""
        if attrs['end_date'] <= attrs['start_date']:
            raise serializers.ValidationError("End date must be after start date.")
        return attrs

    def validate_app(self, value):
        """Validate app exists in registry (dynamic)."""
        from .registry import build_reports_registry
        all_reports = build_reports_registry()
        if value not in all_reports:
            raise serializers.ValidationError(f"Invalid app '{value}'. Available: {list(all_reports.keys())}")
        return value

    def validate_report_type(self, value):
        """Validate report_type for the given app (dynamic)."""
        app = self.initial_data.get('app')
        if app:
            from .registry import get_report_config
            try:
                get_report_config(app, value)  
            except ValueError as e:
                raise serializers.ValidationError(str(e))
        return value
    
    