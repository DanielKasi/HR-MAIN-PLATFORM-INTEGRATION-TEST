from institution.models import Institution
from .models import CustomUser, Profile


def set_owner_user_work_place(institution: Institution):
    user = institution.institution_owner

    profile, created = Profile.objects.get_or_create(user=user)

    profile.institution = institution
    profile.save()

    return profile
