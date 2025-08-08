# Workflow Approval Mechanism

This system enables **multi-level approval workflows** for actions on models like `LeaveRequest`, `Employee`, etc., across different Institutions and user roles. It's designed to be **flexible**, **extensible**, and **developer-friendly**.

---

## Key Concepts

Here's the appropriate **Markdown table documentation** that explains the **model fields** for each of the workflow-related tables in the system.

---

## Table Reference

### `WorkflowCategory`

| Column  | Description                                                             |
| ------- | ----------------------------------------------------------------------- |
| `code`  | Unique identifier for the workflow category (e.g. `leave_request`). |,
| `label` | Human-readable name for the category (e.g. "Leave Request Workflows").        |

---

### `WorkflowAction`

| Column     | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `category` | Foreign key linking to `WorkflowCategory`. Groups actions under a category. |
| `code`     | Unique identifier for the action (e.g. `leave_request_initiation`).                 |
| `label`    | Human-readable label for the workflow action.                               |

---

### `InstitutionApprovalStep`

| Column        | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `institution` | Institution for which this approval step applies.                        |
| `step_name`   | Descriptive name of the step (e.g. "Supervisor and 3 other user's Review").                 |
| `action`      | Workflow action this step belongs to.                                    |
| `level`       | Integer representing the order of approval. Lower = earlier in the flow. This should be auto created i.e they are not set by user.|

---

### `InstitutionApprovalStepApprovorRole`

| Column          | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `step`          | Related approval step.                                         |
| `approver_role` | Role that is allowed to approve this step (e.g. `Supervisor`). |

---

### `InstitutionApprovalStepApprovorUser`

| Column          | Description                                  |
| --------------- | -------------------------------------------- |
| `step`          | Related approval step.                       |
| `approver_user` | Specific user assigned to approve this step. |

---

### `ApprovalTask`

| Column           | Description                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `step`           | Linked `InstitutionApprovalStep` for this task.                                               |
| `content_type`   | Django generic foreign key (points to model like `Product`, `PurchaseOrder`, etc.).           |
| `object_id`      | ID of the object needing approval.                                                            |
| `content_object` | Generic relation to the object needing approval.                                              |
| `status`         | Current status of the task (`not_started`, `pending`, `completed`, `rejected`, `terminated`). |
| `comment`        | Optional comment left by approver.                                                            |
| `approved_by`    | User profile who approved or rejected the task.
| `approved_at`    | Time the said approver approved this task.                                               |
| `updated_at`     | Timestamp when the task was last updated.                                                     |
| `created_at`     | Date when the task was created.                                                               |

---

## Example Flow: Creating a Leave Request

1. A LeaveRequest is created.
2. The backend finds the `WorkflowAction` with code `leave_request_initiation`.
3. It looks up `InstitutionApprovalStep`s where the institution is related to one whose Leave Request is being created, Below is a sample of the retrieved steps:
    - Supervisor (level 1)
    - Manager (level 2)
    - Director (level 3)

4. A corresponding `ApprovalTask` is created for each step.
5. Only the first task is `"pending"` — the rest are `"not_started"`.
6. As each task is approved, the next one becomes `"pending"`.
7. At this point is where the frontend should get to set notifications for all users.
8. For a user to get this notification, s/he should either be part of the users with a role from InstitutionApprovalStepApprovorRole or a specifc user from InstitutionApprovalStepApprovorUser where the step is this new one in pending. 

---

## How Approval Works

Each `ApprovalTask` can be approved by calling:

```python
task.mark_completed(user: CustomUser)
```

### What happens when `mark_completed(user)` is called?

1. The task’s status is set to `"completed"`.
2. The comment is saved if provided. The approver is also stored
3. The system checks if a next level exists (`level + 1`).
4. If found:
    - That step’s `ApprovalTask` is activated (status set to `"pending"`).
    - For the fact that we notify concerned users whenever a task associated to them is set to pending, the same is done here. 
5. If there is **no next level**:
    - The related object (e.g., a `LeaveRequest`) must have a method `finish_workflow()` that is automatically called to finalize approval. This method is implemented differently according to the business logic constraining that model.

---


## How Rejecting Works

Each `ApprovalTask` can be rejected by calling:

```python
task.mark_rejected(user: CustomUser)
```

### What happens when `mark_rejected(user)` is called?

1. The task’s status is set to `"rejected"`.
2. The comment is saved if provided. The rejecter is also stored
3. The system checks if a next level exists (`level + 1`).
4. If found:
    - The statuses of the rest is changed to 'terminated'.

5. We still call `finish_workflow()`.

---

## What is in `finish_workflow()`?
- This method is implemented on any model that is expected to have approvals.
- It checks whether all tasks associated to the model instance are completed or rejected or terminated. i.e There exists no pending or not_started tasks.
- If they are all completed, the creation or whatever has to be done according to business logic is done.
- Else if one of them is terminated or rejected, then what has to be done for such a case is done.


## Approval Statuses

| Status | Description |
|--------|-------------|
| `not_started` | Awaiting previous approvals |
| `pending`     | Awaiting action from the current approver |
| `completed`   | Approved successfully |
| `rejected`    | Rejected and halted |
| `terminated`    | Terminated because of rejection of others above it |


---

## Retrieving task summary for a user.
- Acted on by me
- Incoming Tasks
- Outgoing Tasks
- Critical Tasks
- Expired Tasks
- Open Tasks

### Acted on by me
- This shows a list of tasks a user has worked on. 
- It includes tasks of all status.

#### How to get them
    - Get all tasks a user has approved.
    - Use ApprovalTask.approved_by = to the user.
    

### Incoming Tasks
- This shows a list of tasks that are to be approved by this user but they haven't yet reached his level to approve.


#### How to get them
    - Get all distinct tasks for a user using whose:
        ApprovalTask.status = 'not_started'
        and they should have an association with
        InstitutionApprovalStepApprovorRole.approver_role or InstitutionApprovalStepApprovorUser
    

### Outgoing Tasks
- These are tasks a user has worked on but they are still in pipeline pending approval by others.


#### How to get them
    - Get all tasks a user has approved.
    - Use ApprovalTask.approved_by = to the user.
    - Filter them by those whose subsequent tasks have atleast one which is pending



### Open Tasks
- These are tasks that are pending action by the user

#### How to get them
    - Get all distinct tasks for a user using whose:
        ApprovalTask.status = 'pending'
        and they should have an association with
        InstitutionApprovalStepApprovorRole.approver_role or InstitutionApprovalStepApprovorUser

### Critical Tasks
- These are tasks that are pending action by the user but they have delayed

#### How to get them
    - Get all distinct tasks for a user using whose:
        ApprovalTask.status = 'pending'
        and they should have an association with
        InstitutionApprovalStepApprovorRole.approver_role or InstitutionApprovalStepApprovorUser
    - Filter them by time according to set configuration for this institution. Something like `time_taken_to_mark_task_critical`.


### EXpired Tasks
- These are tasks that are pending action by the user but they have expired

#### How to get them
    - Get all distinct tasks for a user using whose:
        ApprovalTask.status = 'pending'
        and they should have an association with
        InstitutionApprovalStepApprovorRole.approver_role or InstitutionApprovalStepApprovorUser
    - Filter them by time according to set configuration for this institution. Something like `time_taken_to_expire_task`.
