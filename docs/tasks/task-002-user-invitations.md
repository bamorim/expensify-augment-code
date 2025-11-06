# Task: User Invitations

## Meta Information

- **Task ID**: `TASK-002`
- **Title**: User Invitations - Invite and Accept
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-11-06
- **Updated**: 2025-11-06
- **Estimated Effort**: 4-6 hours

## Related Documents

- **PRD**: `docs/product/prd-main.md` (FR1)
- **Dependencies**: TASK-001 (Organization Management)

## Description

Enable organization admins to invite users via email. Invited users can accept invitations and join organizations with the Member role. This completes the basic user management flow.

## Acceptance Criteria

- [ ] Database schema includes Invitation model
- [ ] Admins can send invitations by email address
- [ ] Invitations have pending/accepted/expired states
- [ ] Users can view their pending invitations
- [ ] Users can accept invitations and become organization members
- [ ] Email notifications are sent for invitations (using existing Nodemailer setup)
- [ ] Only admins can invite users to their organizations
- [ ] Backend has comprehensive tests for invitation flow
- [ ] UI for sending and accepting invitations

## TODOs

- [ ] Create Prisma migration for Invitation model
  - Invitation: id, organizationId, email, role, status, invitedById, createdAt, expiresAt
  - Status enum: PENDING, ACCEPTED, EXPIRED
  - Indexes on email and organizationId
- [ ] Extend organization router or create invitation router
  - `invite` mutation: Create invitation (admin only)
  - `listInvitations` query: Get pending invitations for current user's email
  - `accept` mutation: Accept invitation and create OrganizationMember
  - `listOrganizationInvitations` query: Get all invitations for an org (admin only)
- [ ] Implement email sending for invitations
  - Use existing Nodemailer configuration
  - Include invitation link/code
  - Handle email errors gracefully
- [ ] Write comprehensive tests
  - Test invitation creation (admin only)
  - Test non-admins cannot invite
  - Test invitation acceptance
  - Test duplicate invitation handling
  - Test expired invitations
- [ ] Create UI components
  - Admin view: Invite user form in organization page
  - User view: List of pending invitations
  - Accept invitation button/flow
- [ ] Manual testing
  - Invite users as admin
  - Verify email is sent
  - Accept invitation as invited user
  - Test authorization (non-admins cannot invite)

## Progress Updates

_No updates yet_

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Manually tested end-to-end

## Notes

- Invitations expire after 7 days (configurable)
- Users can be invited even if they don't have an account yet
- When accepting, match invitation email with user's email
- Consider rate limiting for invitation sending (future enhancement)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-06

