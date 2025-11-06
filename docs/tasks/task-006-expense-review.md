# Task: Expense Review Workflow

## Meta Information

- **Task ID**: `TASK-006`
- **Title**: Expense Review and Approval Workflow
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 4-5 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR7)
- **Dependencies**: TASK-005 (Expense Submission)

## Description

Implement the review workflow for expenses that require manual approval. Admins can view pending expenses, approve or reject them with optional comments, and track the complete audit trail.

## Acceptance Criteria

- [ ] Admins can view all pending expenses for their organization
- [ ] Admins can approve expenses with optional comments
- [ ] Admins can reject expenses with optional comments
- [ ] Expense status is updated appropriately
- [ ] Audit trail tracks reviewer and timestamp
- [ ] Users can see review status and comments on their expenses
- [ ] Backend has comprehensive tests for review workflow
- [ ] UI for reviewing expenses

## TODOs

- [ ] Extend Expense model with review fields (migration)
  - Add: reviewedById (nullable), reviewedAt (nullable), reviewComment (nullable)
  - Foreign key to User (reviewer)
- [ ] Extend expense router with review procedures
  - `listPendingReview` query: Get all pending expenses for organization (admin only)
  - `approve` mutation: Approve expense (admin only)
  - `reject` mutation: Reject expense with reason (admin only)
- [ ] Implement authorization checks
  - Only admins can review expenses
  - Admins can only review expenses in their organization
  - Users cannot review their own expenses (optional safeguard)
- [ ] Write comprehensive tests
  - Test approve workflow
  - Test reject workflow
  - Test authorization (admin only, correct organization)
  - Test status transitions
  - Test audit trail fields
- [ ] Create UI components
  - Pending expenses list for admins
  - Expense review page with approve/reject actions
  - Comment input for review decisions
  - Review history display on expense detail
- [ ] Manual testing
  - Submit expenses requiring review
  - Review as admin
  - Verify status updates
  - Test authorization
  - Verify audit trail

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- Review comments are optional but recommended
- Consider email notifications for review decisions (future enhancement)
- Prevent users from reviewing their own expenses
- Track complete audit trail: who, when, what decision, why
- Consider bulk review actions (future enhancement)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

