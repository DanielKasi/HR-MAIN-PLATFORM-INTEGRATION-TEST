# Workflow Approval Mechanism

This system enables **multi-level approval workflows** for actions on models like `Product`, `PurchaseOrder`, etc., across different Institutions and user roles. It's designed to be **flexible**, **extensible**, and **developer-friendly**.

---

## Key Concepts

| Term | Description |
|------|-------------|
| `WorkflowCategory` | Groups actions under a broader label (e.g., `product_workflows`). |
| `WorkflowAction`   | Represents a specific workflow action (e.g., `product_creation`) that triggers approval. |
| `ApprovalStep`     | A defined approval level for a specific role and Institution. |
| `ApprovalTask`     | Tracks the status of an approval instance for a specific object. Created dynamically when an action is triggered. |

---

## Example Flow: Uploading a Product

1. A product is created.
2. The backend finds the `WorkflowAction` with code `product_creation`.
3. It looks up `ApprovalStep`s for that action, Institution, and roles:
    - Supervisor (level 1)
    - Manager (level 2)
    - Director (level 3)
4. A corresponding `ApprovalTask` is created for each step.
5. Only the first task is `"pending"` — the rest are `"not_started"`.
6. As each task is approved, the next one becomes `"pending"`.

---

## How Approval Works

Each `ApprovalTask` can be approved by calling:

```python
task.approve()
```

### What happens when `.approve()` is called?

1. The task’s status is set to `"completed"`.
2. The system checks if a next level exists (`level + 1`).
3. If found:
    - That step’s `ApprovalTask` is activated (status set to `"pending"`).
4. If there is **no next level**:
    - The related object (e.g., a `Product`) must have a method `finish_workflow()` that is automatically called to finalize approval.

---

## Approval Statuses

| Status | Description |
|--------|-------------|
| `not_started` | Awaiting previous approvals |
| `pending`     | Awaiting action from the current approver |
| `completed`   | Approved successfully |
| `rejected`    | Rejected and halted |

---