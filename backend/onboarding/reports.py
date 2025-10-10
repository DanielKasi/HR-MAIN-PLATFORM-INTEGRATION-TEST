from .models import (
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    EmployeeSeparation,
    ResignationRequest,
    TerminationInitiation,
)

REPORT_CONFIG = {
    'Offboarding Stages': OffboardingStage,
    'Separation Types': InstitutionEmployeeSeparationTypes,
    'Separation Policies': InstitutionSeparationPolicy,
    'Employee Separations': EmployeeSeparation,
    'Resignation Requests': ResignationRequest,
    'Termination Initiations': TerminationInitiation,
}

