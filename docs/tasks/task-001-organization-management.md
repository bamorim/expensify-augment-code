# Task: Organization Management

## Meta Information

- **Task ID**: `TASK-001`
- **Title**: Organization Management - Create and View Organizations
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 4-6 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR1, FR2)
- **Dependencies**: None (first task)

## Description

Implement the foundation for multi-tenant organization management. Users should be able to create organizations and view organizations they belong to. The user who creates an organization automatically becomes an admin.

This establishes the core multi-tenancy pattern that all other features will build upon.

## Acceptance Criteria

- [ ] Database schema includes Organization and OrganizationMember models with proper relationships
- [ ] Users can create a new organization with a name
- [ ] Organization creator is automatically assigned as admin
- [ ] Users can view a list of organizations they belong to
- [ ] UI displays organization list and creation form
- [ ] Backend has comprehensive tests for organization creation and retrieval
- [ ] Data isolation is enforced (users only see their organizations)

## TODOs

- [ ] Create Prisma migration for Organization and OrganizationMember models
  - Organization: id, name, createdAt, updatedAt
  - OrganizationMember: id, userId, organizationId, role (ADMIN/MEMBER), createdAt
  - Proper indexes and foreign keys
- [ ] Create tRPC router `src/server/api/routers/organization.ts`
  - `create` mutation: Create organization and add creator as admin
  - `list` query: Get all organizations for current user
  - `getById` query: Get organization details (with authorization check)
- [ ] Write comprehensive tests for organization router
  - Test organization creation
  - Test automatic admin assignment
  - Test list filtering (users only see their orgs)
  - Test authorization on getById
- [ ] Create UI page for organization management
  - List of user's organizations
  - Form to create new organization
  - Basic navigation/layout
- [ ] Manual testing
  - Create organization as different users
  - Verify data isolation between users
  - Test edge cases (empty name, duplicate names, etc.)

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- This task establishes the multi-tenancy foundation
- Role enum: ADMIN, MEMBER (can be extended later)
- Organization names don't need to be unique globally (scoped to user preference)
- Keep UI simple for now - focus on functionality

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

