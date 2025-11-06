# Task: Expense Categories

## Meta Information

- **Task ID**: `TASK-003`
- **Title**: Expense Categories - CRUD Operations
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 3-4 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR3)
- **Dependencies**: TASK-001 (Organization Management)

## Description

Implement expense category management. Admins can create, edit, and delete expense categories within their organization. Categories are organization-scoped and have a name and optional description.

## Acceptance Criteria

- [ ] Database schema includes ExpenseCategory model
- [ ] Admins can create expense categories
- [ ] Admins can edit category name and description
- [ ] Admins can delete categories (with appropriate safeguards)
- [ ] All organization members can view categories
- [ ] Categories are properly scoped to organizations
- [ ] Backend has comprehensive tests
- [ ] UI for category management (admin) and viewing (all users)

## TODOs

- [ ] Create Prisma migration for ExpenseCategory model
  - ExpenseCategory: id, organizationId, name, description, createdAt, updatedAt
  - Unique constraint on (organizationId, name)
  - Foreign key to Organization
- [ ] Create tRPC router `src/server/api/routers/expense-category.ts`
  - `create` mutation: Create category (admin only)
  - `update` mutation: Update category (admin only)
  - `delete` mutation: Delete category (admin only)
  - `list` query: Get all categories for organization (all members)
  - `getById` query: Get category details (all members)
- [ ] Write comprehensive tests
  - Test category creation (admin only)
  - Test non-admins cannot create/edit/delete
  - Test duplicate name prevention
  - Test organization scoping
  - Test category listing
- [ ] Create UI components
  - Admin view: Category management page (list, create, edit, delete)
  - Member view: Category list (read-only)
  - Category form component
- [ ] Manual testing
  - Create categories as admin
  - Verify non-admins cannot modify
  - Test duplicate name handling
  - Test deletion

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- Category names must be unique within an organization
- Consider soft delete vs hard delete (start with hard delete, can enhance later)
- Prevent deletion if category has associated policies or expenses (future consideration)
- Keep UI simple - basic CRUD operations

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

