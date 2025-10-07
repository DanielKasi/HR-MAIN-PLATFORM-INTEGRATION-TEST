from .models import (
    OffboardingStage,
    InstitutionEmployeeSeparationTypes,
    InstitutionSeparationPolicy,
    EmployeeSeparation,
    ResignationRequest,
    TerminationInitiation,
)

REPORT_CONFIG = {
    'offboarding stages': OffboardingStage,
    'separation types': InstitutionEmployeeSeparationTypes,
    'separation policies': InstitutionSeparationPolicy,
    'employee separations': EmployeeSeparation,
    'resignation requests': ResignationRequest,
    'termination initiations': TerminationInitiation,
}

