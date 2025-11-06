# Task: Expense Categories

## Meta Information

- **Task ID**: `TASK-003`
- **Title**: Expense Categories - CRUD Operations
- **Status**: `Complete`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 3-4 hours
- **Actual Effort**: ~1 hour

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR3)
- **Dependencies**: TASK-001 (Organization Management)

## Description

Implement expense category management. Admins can create, edit, and delete expense categories within their organization. Categories are organization-scoped and have a name and optional description.

## Acceptance Criteria

- [x] Database schema includes ExpenseCategory model
- [x] Admins can create expense categories
- [x] Admins can edit category name and description
- [x] Admins can delete categories (with appropriate safeguards)
- [x] All organization members can view categories
- [x] Categories are properly scoped to organizations
- [x] Backend has comprehensive tests
- [x] UI for category management (admin) and viewing (all users)

## TODOs

- [x] Create Prisma migration for ExpenseCategory model
  - ExpenseCategory: id, organizationId, name, description, createdAt, updatedAt
  - Unique constraint on (organizationId, name)
  - Foreign key to Organization
- [x] Create tRPC router `src/server/api/routers/expense-category.ts`
  - `create` mutation: Create category (admin only)
  - `update` mutation: Update category (admin only)
  - `delete` mutation: Delete category (admin only)
  - `list` query: Get all categories for organization (all members)
  - `getById` query: Get category details (all members)
- [x] Write comprehensive tests
  - Test category creation (admin only)
  - Test non-admins cannot create/edit/delete
  - Test duplicate name prevention
  - Test organization scoping
  - Test category listing
- [x] Create UI components
  - Admin view: Category management page (list, create, edit, delete)
  - Member view: Category list (read-only)
  - Category form component
- [x] Manual testing
  - Create categories as admin
  - Verify non-admins cannot modify
  - Test duplicate name handling
  - Test deletion

## Progress Updates

### 2025-11-06 - Implementation Complete

**Completed:**
1. ✅ Created Prisma migration for ExpenseCategory model
   - Added ExpenseCategory model with all required fields
   - Implemented unique constraint on (organizationId, name)
   - Added foreign key relationship to Organization
   - Migration: `20251106230452_add_expense_category`

2. ✅ Created tRPC router at `src/server/api/routers/expense-category.ts`
   - Implemented `create` mutation (admin only)
   - Implemented `update` mutation (admin only)
   - Implemented `delete` mutation (admin only)
   - Implemented `list` query (all members)
   - Implemented `getById` query (all members)
   - Added router to `src/server/api/root.ts`

3. ✅ Wrote comprehensive tests at `src/server/api/routers/expense-category.test.ts`
   - 16 tests covering all CRUD operations
   - Tests for admin-only authorization
   - Tests for duplicate name prevention
   - Tests for organization scoping
   - Tests for member access to read operations
   - All tests passing ✅

4. ✅ Verified code quality
   - `pnpm check` passed with no errors
   - ESLint and TypeScript checks passed

**Notes:**
- Backend implementation is complete and fully tested
- Categories are properly scoped to organizations
- Admin-only operations are enforced
- All members can view categories
- Duplicate names within an organization are prevented
- Same category names are allowed across different organizations

### 2025-11-06 - UI Implementation Complete

**Completed:**
1. ✅ Created UI component at `src/app/_components/expense-categories.tsx`
   - Admin view with create, edit, and delete functionality
   - Member view with read-only access
   - Inline editing for categories
   - Confirmation dialog for deletions
   - Error handling and loading states

2. ✅ Integrated into organization details page
   - Added ExpenseCategories component to `src/app/_components/organization-details.tsx`
   - Categories section appears for all organization members
   - Admin controls only visible to admins

3. ✅ Features implemented:
   - Create new categories with name and optional description
   - Edit existing categories inline
   - Delete categories with confirmation
   - View all categories (sorted alphabetically)
   - Responsive design matching existing T3 app style
   - Real-time updates using tRPC mutations and cache invalidation

4. ✅ Manual testing completed
   - Verified category creation as admin
   - Verified non-admins can view but not modify
   - Tested duplicate name handling (shows error)
   - Tested deletion with confirmation
   - All functionality working as expected ✅

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] Tests written and passing (16 tests, all passing)
- [x] Documentation updated
- [x] Manually tested end-to-end

## Notes

- Category names must be unique within an organization
- Consider soft delete vs hard delete (start with hard delete, can enhance later)
- Prevent deletion if category has associated policies or expenses (future consideration)
- Keep UI simple - basic CRUD operations

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

