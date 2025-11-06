# Task: Policy Management

## Meta Information

- **Task ID**: `TASK-004`
- **Title**: Policy Management - Create and Manage Policies
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 5-7 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR4)
- **Dependencies**: TASK-001 (Organization Management), TASK-003 (Expense Categories)

## Description

Implement policy management for expense reimbursement. Admins can create policies that define maximum amounts per period and review rules. Policies can be organization-wide or user-specific, with user-specific policies taking precedence.

## Acceptance Criteria

- [ ] Database schema includes Policy model
- [ ] Admins can create organization-wide policies per category
- [ ] Admins can create user-specific policies per category
- [ ] Policies specify max amount per period (daily, weekly, monthly)
- [ ] Policies specify review type (auto-approve or manual review)
- [ ] User-specific policies override organization-wide policies
- [ ] Backend has comprehensive tests including precedence rules
- [ ] UI for policy management

## TODOs

- [ ] Create Prisma migration for Policy model
  - Policy: id, organizationId, categoryId, userId (nullable), maxAmount, period, requiresReview, createdAt, updatedAt
  - Period enum: DAILY, WEEKLY, MONTHLY
  - Unique constraint on (organizationId, categoryId, userId) to prevent duplicates
  - Foreign keys to Organization, ExpenseCategory, User
- [ ] Create tRPC router `src/server/api/routers/policy.ts`
  - `create` mutation: Create policy (admin only)
  - `update` mutation: Update policy (admin only)
  - `delete` mutation: Delete policy (admin only)
  - `list` query: Get all policies for organization (admin only)
  - `getApplicablePolicy` query: Get applicable policy for user/category combination
- [ ] Implement policy resolution logic
  - Check for user-specific policy first
  - Fall back to organization-wide policy
  - Return null if no policy exists
- [ ] Write comprehensive tests
  - Test policy creation (org-wide and user-specific)
  - Test policy precedence (user-specific overrides org-wide)
  - Test authorization (admin only)
  - Test policy resolution for various scenarios
  - Test duplicate prevention
- [ ] Create UI components
  - Policy management page for admins
  - Policy list with filters (all, org-wide, user-specific)
  - Policy form (create/edit)
  - Policy viewer showing applicable policy for user/category
- [ ] Manual testing
  - Create org-wide and user-specific policies
  - Verify precedence rules
  - Test policy resolution
  - Test edge cases

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- Period types: DAILY, WEEKLY, MONTHLY (simple implementation for v1)
- requiresReview: boolean (true = manual review, false = auto-approve if under limit)
- maxAmount: stored in cents to avoid floating point issues
- Policy resolution is critical - must be well-tested
- Consider adding a policy debugging tool in UI (future enhancement)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

