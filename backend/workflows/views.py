from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from general.serializers import MessageResponseSerializer
from users.models import Profile, UserRole
from users.serializers import CustomUserSerializer
from workflows.models import (
    ApprovalTask,
    InstitutionApprovalStep,
    InstitutionApprovalStepApprovorRole,
    WorkflowAction,
    InstitutionApprovalStepApprovorUser,
)
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction
from drf_spectacular.utils import extend_schema

from workflows.request_serializers import ApprovalTaskStatusUpdateSerializer
from workflows.serializers import (
    ReorderStepsSerializer,
    InstitutionApprovalStepSerializer,
    ApprovalTaskSerializer,
    WorkflowActionSerializer,
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()


class ApproveTaskAPIView(APIView):
    @extend_schema(
        responses={200: ApprovalTaskSerializer(many=True)},
        description="This lets authenticated user view all tasks assigned to his role.",
        summary="View self tasks",
        tags=["WorkFlows"],
    )
    def get(self, request):
        user = request.user
        user_roles = user.user_roles.values_list("role_id", flat=True)

        tasks = ApprovalTask.objects.filter(
            # 1) any step whose through‐model row’s approver_role is in my user_roles
            Q(step__roles__approver_role__id__in=user_roles)
            |
            # 2) OR tasks where I’m explicitly the approver
            Q(step__approver__approver_user__user__id=user.id)
        ).distinct()  # collapse duplicate joins back into unique tasks
        serializer = ApprovalTaskSerializer(tasks, many=True)
        return Response(serializer.data)


class ApproveTaskDetailAPIView(APIView):
    @extend_schema(
        request=ApprovalTaskStatusUpdateSerializer,
        responses={200: MessageResponseSerializer},
        description="This lets authenticated user to approve a task assigned to his role.",
        summary="Approve task",
        tags=["WorkFlows"],
    )
    # Inside the ApproveTaskDetailAPIView class
    def patch(self, request, task_id):
        new_status = request.data.get("status", None)
        task_comment = request.data.get("comment", "")
        if not new_status:
            return Response(
                {"detail": "Wrong status"}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ApprovalTaskStatusUpdateSerializer(data=request.data)
        if serializer.is_valid():
            task = get_object_or_404(ApprovalTask, pk=task_id)
            user = request.user
            user_roles = user.user_roles.values_list("role_id", flat=True)

            step_role_ids = set(
                InstitutionApprovalStepApprovorRole.objects.filter(step=task.step).values_list(
                    "approver_role_id", flat=True
                )
            )
            approver_user_ids = set(
                InstitutionApprovalStepApprovorUser.objects.filter(step=task.step).values_list(
                    "approver_user__user__id", flat=True
                )
            )

            matching_role = next((x for x in step_role_ids if x in user_roles), None)

            if matching_role is None and not request.user.id in approver_user_ids and request.user.id != task.step.Institution.Institution_owner.id:
                return Response(
                    {"detail": "You are not allowed to approve this task."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            data = serializer.validated_data

            # Import the notification function
            from workflows.notifications import notify_workflow_participants

            if data["status"] == "completed":
                if task.status == "completed":
                    return Response(
                        {"detail": "Task already completed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                task.comment = task_comment
                task.mark_completed(request.user)

                notify_workflow_participants(task, "completed", request.user)

                return Response({"message": "Task approved successfully."}, status=200)
            elif data["status"] == "rejected":
                if task.status == "rejected":
                    return Response(
                        {"detail": "Task already cancelled."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                task.comment = task_comment
                task.mark_rejected(request.user)

                notify_workflow_participants(task, "rejected", request.user)

                ApprovalTask.objects.filter(
                    content_type=task.content_type,
                object_id=task.object_id
                ).exclude(id=task.id).filter(status__in=["not_started", "pending"]).update(status="terminated")
                return Response({"message": "Task rejected. All other pending and not started steps terminated."}, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"detail": "Only completion is implemented."},
                    status=status.HTTP_406_NOT_ACCEPTABLE,
                )

        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class WorkflowActionAPIView(APIView):
    @extend_schema(
        responses={200: WorkflowActionSerializer(many=True)},
        description="This lets someone view all possible worflow actions they can set.",
        summary="View workflow actions",
        tags=["WorkFlows"],
    )
    def get(self, request):
        workflow_actions = WorkflowAction.objects.all()
        serializer = WorkflowActionSerializer(workflow_actions, many=True)
        return Response(serializer.data)


class InstitutionApprovalStepAPIView(APIView):
    @extend_schema(
        responses={200: InstitutionApprovalStepSerializer(many=True)},
        description="This lets someone view all possible approvals a Institution has structured.",
        summary="View Institution's approval steps",
        tags=["WorkFlows"],
    )
    def get(self, request, Institution_id):
        step_id = request.query_params.get("step", None)
        if step_id:
            single_Institution_approval_step = InstitutionApprovalStep.objects.filter(
                id=step_id, Institution__id=Institution_id
            ).first()
            serializer = InstitutionApprovalStepSerializer(single_Institution_approval_step)
            return Response(serializer.data, status=status.HTTP_200_OK)

        Institution_approval_steps = InstitutionApprovalStep.objects.filter(Institution__id=Institution_id)
        serializer = InstitutionApprovalStepSerializer(Institution_approval_steps, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=InstitutionApprovalStepSerializer,
        responses={201: InstitutionApprovalStepSerializer},
        description="This lets someone create an approval for a Institution.",
        summary="Create a Institution approval step.",
        tags=["WorkFlows"],
    )
    def post(self, request, Institution_id):

        mutable_data = request.data.copy()
        mutable_data["Institution"] = Institution_id
        action_id = request.data.get("action")
        last_level_step = InstitutionApprovalStep.objects.filter(
            action__id=action_id, Institution__id=Institution_id
        ).last()

        new_level = 1
        if last_level_step:
            new_level = last_level_step.level + 1
        mutable_data["level"] = new_level

        serializer = InstitutionApprovalStepSerializer(
            data=mutable_data, context={"request": request}
        )
        if serializer.is_valid():
            Institution_approval_step = serializer.save()
            return Response(
                InstitutionApprovalStepSerializer(Institution_approval_step).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        request=InstitutionApprovalStepSerializer,
        responses={200: InstitutionApprovalStepSerializer},
        description="Partially update a Institution approval step (name, roles, approvers, action).",
        summary="Update Institution approval step",
        tags=["WorkFlows"],
    )
    def patch(self, request, Institution_id):
        # 1. fetch the step or 404
        try:
            step_id = request.query_params.get("step", None)
            if step_id is None:
                raise InstitutionApprovalStep.DoesNotExist()
            step = InstitutionApprovalStep.objects.get(pk=step_id, Institution_id=Institution_id)
        except InstitutionApprovalStep.DoesNotExist:
            return Response(
                {"detail": "Approval step not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data

        # 2. update simple fields
        if "step_name" in data:
            step.step_name = data["step_name"]
        if "action" in data:
            step.action_id = data["action"]
        # (we leave level & Institution untouched)
        step.save()

        # 3. update roles if provided
        if "roles" in data:
            # clear old
            InstitutionApprovalStepApprovorRole.objects.filter(step=step).delete()
            # add new
            for role_id in data["roles"]:
                InstitutionApprovalStepApprovorRole.objects.create(
                    step=step, approver_role_id=role_id
                )

        # 4. update approvers if provided
        if "approvers" in data:
            # clear old
            InstitutionApprovalStepApprovorUser.objects.filter(step=step).delete()
            # add new
            for profile_id in data["approvers"]:
                profile = Profile.objects.get(id=profile_id)
                if profile.institution_id == Institution_id:
                    InstitutionApprovalStepApprovorUser.objects.create(
                        step=step, approver_user=profile
                    )

        # 5. return refreshed representation
        return Response(InstitutionApprovalStepSerializer(step).data)

    @extend_schema(
        responses={204: None},
        description="Delete a Institution approval step and its associations.",
        summary="Delete Institution approval step",
        tags=["WorkFlows"],
    )
    def delete(self, request, Institution_id):
        try:
            step_id = request.query_params.get("step", None)
            if step_id is None:
                raise InstitutionApprovalStep.DoesNotExist()
            step = InstitutionApprovalStep.objects.get(pk=step_id, Institution_id=Institution_id)
        except InstitutionApprovalStep.DoesNotExist:
            return Response(
                {"detail": "Approval step not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        step.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InstitutionApprovalStepReorderAPIView(APIView):
    @extend_schema(
        request=ReorderStepsSerializer,
        responses={200: InstitutionApprovalStepSerializer(many=True)},
        summary="Bulk-reorder Institution approval steps",
        description=(
            "Payload:\n"
            "  {\n"
            '    "steps": [\n'
            '      { "id": 12, "level": 1 },\n'
            '      { "id": 15, "level": 2 }\n'
            "    ]\n"
            "  }\n"
        ),
        tags=["WorkFlows"],
    )
    def patch(self, request, Institution_id):
        steps_payload = request.data.get("steps")
        if not isinstance(steps_payload, list) or not steps_payload:
            return Response(
                {"detail": "`steps` must be a non-empty list of {id, level}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract IDs and map to desired levels
        try:
            new_levels = {int(item["id"]): int(item["level"]) for item in steps_payload}
        except (TypeError, KeyError, ValueError):
            return Response(
                {"detail": "Each step must have integer 'id' and 'level'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = list(new_levels.keys())

        qs = InstitutionApprovalStep.objects.filter(Institution_id=Institution_id, id__in=ids)
        if qs.count() != len(ids):
            return Response(
                {"detail": "One or more step IDs not found for this Institution."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action_ids = set(qs.values_list("action_id", flat=True))
        if len(action_ids) > 1:
            return Response(
                {"detail": "All steps must belong to the same action."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate target levels
        for sid, lvl in new_levels.items():
            if lvl < 1:
                return Response(
                    {"detail": f"Invalid level for step {sid}: must be ≥ 1."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Compute offset = number of steps (so temp-levels = old_level + offset)
        offset = qs.count()

        with transaction.atomic():
            # Phase 1: bump up into [offset+1 .. offset+max_level]
            for step in qs:
                step.level = step.level + offset
            InstitutionApprovalStep.objects.bulk_update(qs, ["level"])

            # Phase 2: assign the desired levels [1..n]
            for step in qs:
                step.level = new_levels[step.id]
            InstitutionApprovalStep.objects.bulk_update(qs, ["level"])

        # Return the newly ordered list
        action_id = action_ids.pop()
        updated = InstitutionApprovalStep.objects.filter(
            Institution_id=Institution_id, action_id=action_id
        ).order_by("level")
        serializer = InstitutionApprovalStepSerializer(updated, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
