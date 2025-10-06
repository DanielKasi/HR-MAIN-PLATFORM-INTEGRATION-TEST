from .models import (
    InterviewStage, JobAdvertApplication, JobInterview, JobPositionAdvert, SkillZone
)
from onboarding.models import OnBoarding

REPORT_CONFIG = {
    'candidates': JobAdvertApplication,
    'interviews': JobInterview,
    'job openings': JobPositionAdvert,
    'onboarding': OnBoarding,
    'skill zone': SkillZone,
    'interview stages': InterviewStage,
}
