# Task: Policy Management

## Meta Information

- **Task ID**: `TASK-004`
- **Title**: Policy Management - Create and Manage Policies
- **Status**: `Complete`
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

- [x] Database schema includes Policy model
- [x] Admins can create organization-wide policies per category
- [x] Admins can create user-specific policies per category
- [x] Policies specify max amount per period (daily, weekly, monthly)
- [x] Policies specify review type (auto-approve or manual review)
- [x] User-specific policies override organization-wide policies
- [x] Backend has comprehensive tests including precedence rules
- [x] UI for policy management

## TODOs

- [x] Create Prisma migration for Policy model
  - Policy: id, organizationId, categoryId, userId (nullable), maxAmount, period, requiresReview, createdAt, updatedAt
  - Period enum: DAILY, WEEKLY, MONTHLY
  - Unique constraint on (organizationId, categoryId, userId) to prevent duplicates
  - Foreign keys to Organization, ExpenseCategory, User
- [x] Create tRPC router `src/server/api/routers/policy.ts`
  - `create` mutation: Create policy (admin only)
  - `update` mutation: Update policy (admin only)
  - `delete` mutation: Delete policy (admin only)
  - `list` query: Get all policies for organization (admin only)
  - `getApplicablePolicy` query: Get applicable policy for user/category combination
- [x] Implement policy resolution logic
  - Check for user-specific policy first
  - Fall back to organization-wide policy
  - Return null if no policy exists
- [x] Write comprehensive tests
  - Test policy creation (org-wide and user-specific)
  - Test policy precedence (user-specific overrides org-wide)
  - Test authorization (admin only)
  - Test policy resolution for various scenarios
  - Test duplicate prevention
- [x] Create UI components
  - Policy management page for admins
  - Policy list with filters (all, org-wide, user-specific)
  - Policy form (create/edit)
  - Policy viewer showing applicable policy for user/category
- [x] Manual testing
  - Create org-wide and user-specific policies
  - Verify precedence rules
  - Test policy resolution
  - Test edge cases

## Progress Updates

### 2025-11-06 - Implementation Complete

**Database Schema**
- Created Policy model with PolicyPeriod enum (DAILY, WEEKLY, MONTHLY)
- Added unique constraint on (organizationId, categoryId, userId)
- Implemented cascade delete for all foreign keys
- Migration: `20251106233026_add_policy`

**Backend Implementation**
- Created `src/server/api/routers/policy.ts` with 5 procedures:
  - `create`: Admin-only mutation for creating policies
  - `update`: Admin-only mutation for updating policies
  - `delete`: Admin-only mutation for deleting policies
  - `list`: Admin-only query for listing all policies
  - `getApplicablePolicy`: Query for getting applicable policy with precedence logic
- Policy resolution logic:
  - Step 1: Check for user-specific policy using unique constraint
  - Step 2: Fall back to org-wide policy (userId = null)
  - Step 3: Return null if no policy exists
  - Returns type indicator: USER_SPECIFIC, ORGANIZATION_WIDE, or NONE
- Note: Used `findFirst` for org-wide policies due to Prisma limitation with null in unique constraints

**Testing**
- Created comprehensive test suite with 16 tests covering:
  - Policy creation (org-wide and user-specific)
  - Authorization checks (admin-only operations)
  - Validation (non-existent categories, users not in organization)
  - Update and delete operations
  - List functionality
  - **Critical policy precedence tests** verifying user-specific policies override org-wide policies
  - Policy resolution for various scenarios
  - Admin ability to check policies for other users
- All 16 policy tests passing
- All 53 tests across entire project passing

**UI Implementation**
- Created `src/app/_components/policies.tsx` with:
  - Policy management interface for admins
  - Create policy form with category selection, user ID input, amount, period, and review toggle
  - Policy list showing all policies with type (org-wide vs user-specific) and scope
  - Inline edit functionality for updating policies
  - Delete functionality with confirmation
  - Amount conversion between cents (storage) and dollars (display)
  - Non-admin view showing access restriction message
- Integrated into organization details page
- All lint and type checks passing

**Key Technical Decisions**
- Store amounts in cents (integers) to avoid floating point issues
- Use unique constraint to enforce one policy per org/category/user combination
- Implement precedence at query time rather than database level
- Simple period types (DAILY, WEEKLY, MONTHLY) for v1
- Boolean requiresReview flag (true = manual review, false = auto-approve)

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] Tests written and passing
- [x] Documentation updated (if needed)
- [x] Manually tested end-to-end

## Notes

- Period types: DAILY, WEEKLY, MONTHLY (simple implementation for v1)
- requiresReview: boolean (true = manual review, false = auto-approve if under limit)
- maxAmount: stored in cents to avoid floating point issues
- Policy resolution is critical - must be well-tested
- Consider adding a policy debugging tool in UI (future enhancement)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

