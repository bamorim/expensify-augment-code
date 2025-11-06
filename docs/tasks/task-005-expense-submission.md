# Task: Expense Submission and Auto-Processing

## Meta Information

- **Task ID**: `TASK-005`
- **Title**: Expense Submission with Policy Enforcement
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 6-8 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR5, FR6)
- **Dependencies**: TASK-001, TASK-003, TASK-004

## Description

Implement expense submission with automatic policy enforcement. Users submit expenses with date, amount, category, and description. The system automatically applies policy rules to determine if the expense should be auto-rejected, auto-approved, or sent for manual review.

## Acceptance Criteria

- [ ] Database schema includes Expense model with status tracking
- [ ] Users can submit expenses with all required fields
- [ ] System automatically resolves applicable policy
- [ ] Expenses over policy limit are auto-rejected
- [ ] Expenses under limit are auto-approved or sent for review based on policy
- [ ] Expense status is tracked (submitted, approved, rejected, pending_review)
- [ ] Users can view their submitted expenses
- [ ] Backend has comprehensive tests for policy enforcement logic
- [ ] UI for expense submission and viewing

## TODOs

- [ ] Create Prisma migration for Expense model
  - Expense: id, organizationId, userId, categoryId, amount, date, description, status, policyId (applied policy), rejectionReason, createdAt, updatedAt
  - Status enum: PENDING_REVIEW, APPROVED, REJECTED
  - Foreign keys to Organization, User, ExpenseCategory, Policy
  - Indexes on userId, organizationId, status
- [ ] Create tRPC router `src/server/api/routers/expense.ts`
  - `submit` mutation: Submit expense with automatic policy enforcement
  - `list` query: Get expenses for current user
  - `listForOrganization` query: Get all expenses for organization (admin/reviewer)
  - `getById` query: Get expense details
- [ ] Implement policy enforcement logic
  - Resolve applicable policy for user/category
  - Check if expense is within period limits
  - Auto-reject if over limit
  - Auto-approve or mark for review based on policy.requiresReview
  - Store applied policy reference
- [ ] Implement period limit checking
  - Calculate total expenses for user/category in current period
  - Compare against policy maxAmount
  - Handle edge cases (no policy, first expense, etc.)
- [ ] Write comprehensive tests
  - Test expense submission with various policy scenarios
  - Test auto-rejection (over limit)
  - Test auto-approval (under limit, no review required)
  - Test pending review (under limit, review required)
  - Test period calculations (daily, weekly, monthly)
  - Test no policy scenario
- [ ] Create UI components
  - Expense submission form
  - Expense list for user
  - Expense detail view
  - Status indicators
- [ ] Manual testing
  - Submit expenses with different policies
  - Verify auto-rejection for over-limit expenses
  - Verify auto-approval and pending review flows
  - Test period limit calculations

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- Amount stored in cents to avoid floating point issues
- Period calculations:
  - DAILY: expenses from same calendar day
  - WEEKLY: expenses from same week (Monday-Sunday)
  - MONTHLY: expenses from same calendar month
- Auto-rejection includes clear reason message
- Consider timezone handling for date comparisons
- Audit trail: store which policy was applied at submission time

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

