# Task: User Invitations

## Meta Information

- **Task ID**: `TASK-002`
- **Title**: User Invitations - Invite and Accept
- **Status**: `Completed`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 4-6 hours
- **Actual Effort**: ~4 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR1)
- **Dependencies**: TASK-001 (Organization Management)

## Description

Enable organization admins to invite users via email. Invited users can accept invitations and join organizations with the Member role. This completes the basic user management flow.

## Acceptance Criteria

- [x] Database schema includes Invitation model
- [x] Admins can send invitations by email address
- [x] Invitations have pending/accepted/expired states
- [x] Users can view their pending invitations
- [x] Users can accept invitations and become organization members
- [x] Email notifications are sent for invitations (using existing Nodemailer setup)
- [x] Only admins can invite users to their organizations
- [x] Backend has comprehensive tests for invitation flow
- [x] UI for sending and accepting invitations

## TODOs

- [x] Create Prisma migration for Invitation model
  - Invitation: id, organizationId, email, role, status, invitedById, createdAt, expiresAt
  - Status enum: PENDING, ACCEPTED, EXPIRED
  - Indexes on email and organizationId
- [x] Extend organization router or create invitation router
  - `invite` mutation: Create invitation (admin only)
  - `listInvitations` query: Get pending invitations for current user's email
  - `accept` mutation: Accept invitation and create OrganizationMember
  - `listOrganizationInvitations` query: Get all invitations for an org (admin only)
- [x] Implement email sending for invitations
  - Use existing Nodemailer configuration
  - Include invitation link/code
  - Handle email errors gracefully
- [x] Write comprehensive tests
  - Test invitation creation (admin only)
  - Test non-admins cannot invite
  - Test invitation acceptance
  - Test duplicate invitation handling
  - Test expired invitations
- [x] Create UI components
  - Admin view: Invite user form in organization page
  - User view: List of pending invitations
  - Accept invitation button/flow
- [x] Manual testing
  - Invite users as admin
  - Verify email is sent
  - Accept invitation as invited user
  - Test authorization (non-admins cannot invite)

## Progress Updates

### 2025-11-06 - Implementation Complete

**Database Schema**
- Created Invitation model with InvitationStatus enum (PENDING, ACCEPTED, EXPIRED)
- Added proper indexes on email, organizationId, and status
- Migration created and applied successfully

**Backend Implementation**
- Created `src/server/api/routers/invitation.ts` with all required procedures:
  - `invite`: Admin-only mutation to create invitations
  - `listInvitations`: Query to get pending invitations for current user
  - `getById`: Query to get specific invitation details
  - `accept`: Mutation to accept invitation and create membership
  - `listOrganizationInvitations`: Admin-only query to view all org invitations
- Created `src/server/services/email.ts` for sending invitation emails via Nodemailer
- Proper authorization checks (admin-only for invite operations)
- Validation for duplicate invitations and existing members
- Expiration handling (7-day expiry)

**Testing**
- Created comprehensive test suite in `src/server/api/routers/invitation.test.ts`
- 12 tests covering all scenarios:
  - Admin can invite users
  - Non-admins cannot invite
  - Cannot invite to non-existent organization
  - Cannot invite existing members
  - Cannot create duplicate pending invitations
  - List invitations for current user
  - Expired invitations not shown
  - Accept invitation creates membership
  - Cannot accept expired invitations
  - Cannot accept invitations for different email
  - Admin can list organization invitations
  - Non-admin cannot list organization invitations
- All tests passing ✓

**UI Implementation**
- Created organization detail page at `/organizations/[id]`
- Created `OrganizationDetails` component with:
  - Member list display
  - Admin-only invite form
  - Pending invitations list (admin view)
- Created invitations page at `/invitations`
- Created `InvitationsList` component for viewing pending invitations
- Created invitation accept page at `/invitations/[id]`
- Created `InvitationAccept` component for direct link acceptance
- Updated home page with "Invitations" link
- Updated organization list to link to detail pages

**Manual Testing**
- Server running successfully
- Invitation creation working correctly
- Emails being sent to Mailpit (viewable at http://localhost:8025)
- UI components rendering correctly
- Authorization working as expected

## Completion Checklist

- [x] All acceptance criteria met
- [x] Code follows project standards
- [x] Tests written and passing
- [x] Documentation updated (if needed)
- [x] Manually tested end-to-end

## Notes

- Invitations expire after 7 days (configurable)
- Users can be invited even if they don't have an account yet
- When accepting, match invitation email with user's email
- Consider rate limiting for invitation sending (future enhancement)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

