from .models import (
    InterviewStage, JobAdvertApplication, JobInterview, JobPositionAdvert, SkillZone
)
from onboarding.models import OnBoarding

REPORT_CONFIG = {
    'Candidates': JobAdvertApplication,
    'Interviews': JobInterview,
    'Job Openings': JobPositionAdvert,
    # 'onboarding': OnBoarding,
    'Skill Zone': SkillZone,
    'Interview Stages': InterviewStage,
}
