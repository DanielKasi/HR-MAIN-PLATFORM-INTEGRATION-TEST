import importlib
import logging
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

_ALL_REPORTS = None

def build_reports_registry():
    global _ALL_REPORTS
    if _ALL_REPORTS is not None:
        return _ALL_REPORTS

    all_reports = {}
    installed_apps = [app.split('.')[-1] for app in settings.INSTALLED_APPS if app.count('.') == 0 or app.startswith('recruitment')]  # Focus on custom apps; adjust filter

    for app_name in installed_apps:
        try:
            reports_module = importlib.import_module(f'{app_name}.reports')
            if hasattr(reports_module, 'REPORT_CONFIG') and isinstance(reports_module.REPORT_CONFIG, dict):
                config = reports_module.REPORT_CONFIG
                for report_type, model_class in config.items():
                    if not callable(model_class) or not hasattr(model_class, 'get_report_data'):
                        raise ImproperlyConfigured(f"Invalid REPORT_CONFIG in {app_name}: '{report_type}' must map to a model class with 'get_report_data' method.")
                all_reports[app_name] = config
                print(f"Loaded reports config for app: {app_name} ({len(config)} types)")
        except (ImportError, AttributeError) as e:
            print(f"Skipping app {app_name}: {e}")
        except ImproperlyConfigured as e:
            print(f"Config error in {app_name}: {e}")

    _ALL_REPORTS = all_reports
    return _ALL_REPORTS

def get_report_config(app_name, report_type):
    all_reports = build_reports_registry()
    if app_name not in all_reports:
        raise ValueError(f"Invalid app: '{app_name}'. Available apps: {list(all_reports.keys())}")
    if report_type not in all_reports[app_name]:
        raise ValueError(f"Invalid report type '{report_type}' for app '{app_name}'. Available types: {list(all_reports[app_name].keys())}")
    return all_reports[app_name][report_type]

def get_all_reportable_apps():
    return list(build_reports_registry().keys())