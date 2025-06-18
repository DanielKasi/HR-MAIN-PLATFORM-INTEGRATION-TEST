## User Account Scenarios to Consider

- Remember to think about how we will **restrict users whose accounts have been deleted or blocked**.
- **Deletion** and **blocking** are two different scenarios.

---

### Soft Deletion and Account Reactivation

- Consider a scenario where a user's account was **deleted** but had existing activities in the system.
- In such cases, we perform a **soft delete**.
- If an admin tries to create a new account for this user, what should happen?
  - **Suggestion:** Inform the admin to **reactivate the existing (soft-deleted) account** instead.

---

### Email Reuse Across Organisations

- What happens when a user leaves one organisation and joins another?
- If they try to register using an **email address already associated with a different organisation**, should we:
  - **Restrict access?**
  - Allow them to proceed?

> ⚠️ **Note:** These are just discussion points. Do **not implement** them yet — just consider the implications and possible solutions.
