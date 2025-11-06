import { describe, it, expect, vi, beforeEach } from "vitest";
import { invitationRouter } from "./invitation";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import * as emailService from "~/server/services/email";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Mock the email service
vi.mock("~/server/services/email", () => ({
  sendInvitationEmail: vi.fn(),
}));

const mockSendInvitationEmail = vi.mocked(emailService.sendInvitationEmail);

describe("InvitationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invite", () => {
    it("should allow admin to invite a user", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const inviteeEmail = faker.internet.email();
      const result = await caller.invite({
        organizationId: org.id,
        email: inviteeEmail,
        role: "MEMBER",
      });

      expect(result.email).toEqual(inviteeEmail);
      expect(result.organizationId).toEqual(org.id);
      expect(result.role).toEqual("MEMBER");
      expect(result.status).toEqual("PENDING");
      expect(result.invitedById).toEqual(admin.id);

      // Verify invitation was created in database
      const invitation = await db.invitation.findUnique({
        where: { id: result.id },
      });
      expect(invitation).toBeDefined();
      expect(invitation?.email).toEqual(inviteeEmail);

      // Verify email was sent
      expect(mockSendInvitationEmail).toHaveBeenCalledWith({
        to: inviteeEmail,
        organizationName: "Test Org",
        invitedByName: "Admin User",
        invitationId: result.id,
      });
    });

    it("should not allow non-admin to invite users", async () => {
      const member = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: member.id,
              role: "MEMBER",
            },
          },
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.invite({
          organizationId: org.id,
          email: faker.internet.email(),
          role: "MEMBER",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should not allow inviting to non-existent organization", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.invite({
          organizationId: "non-existent-id",
          email: faker.internet.email(),
          role: "MEMBER",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should not allow inviting existing member", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const existingMember = await db.user.create({
        data: {
          name: "Existing Member",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: existingMember.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.invite({
          organizationId: org.id,
          email: existingMember.email!,
          role: "MEMBER",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should not allow duplicate pending invitations", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      const inviteeEmail = faker.internet.email();

      // Create existing pending invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.invitation.create({
        data: {
          organizationId: org.id,
          email: inviteeEmail,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.invite({
          organizationId: org.id,
          email: inviteeEmail,
          role: "MEMBER",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("listInvitations", () => {
    it("should list pending invitations for current user", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create invitation for user
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.invitation.create({
        data: {
          organizationId: org.id,
          email: user.email!,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.listInvitations();

      expect(result).toHaveLength(1);
      expect(result[0]?.email).toEqual(user.email);
      expect(result[0]?.status).toEqual("PENDING");
    });

    it("should not list expired invitations", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create expired invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Expired yesterday

      await db.invitation.create({
        data: {
          organizationId: org.id,
          email: user.email!,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.listInvitations();

      expect(result).toHaveLength(0);
    });
  });

  describe("accept", () => {
    it("should allow user to accept invitation", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await db.invitation.create({
        data: {
          organizationId: org.id,
          email: user.email!,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.accept({ invitationId: invitation.id });

      expect(result.userId).toEqual(user.id);
      expect(result.organizationId).toEqual(org.id);
      expect(result.role).toEqual("MEMBER");

      // Verify membership was created
      const member = await db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
      });
      expect(member).toBeDefined();

      // Verify invitation was marked as accepted
      const updatedInvitation = await db.invitation.findUnique({
        where: { id: invitation.id },
      });
      expect(updatedInvitation?.status).toEqual("ACCEPTED");
    });

    it("should not allow accepting expired invitation", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
          email: faker.internet.email(),
        },
      });

      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create expired invitation
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      const invitation = await db.invitation.create({
        data: {
          organizationId: org.id,
          email: user.email!,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.accept({ invitationId: invitation.id }),
      ).rejects.toThrow(TRPCError);

      // Verify invitation was marked as expired
      const updatedInvitation = await db.invitation.findUnique({
        where: { id: invitation.id },
      });
      expect(updatedInvitation?.status).toEqual("EXPIRED");
    });

    it("should not allow accepting invitation for different email", async () => {
      const user1 = await db.user.create({
        data: {
          name: "User 1",
          email: faker.internet.email(),
        },
      });

      const user2 = await db.user.create({
        data: {
          name: "User 2",
          email: faker.internet.email(),
        },
      });

      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create invitation for user1
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await db.invitation.create({
        data: {
          organizationId: org.id,
          email: user1.email!,
          role: "MEMBER",
          invitedById: admin.id,
          expiresAt,
        },
      });

      // Try to accept as user2
      const mockSession = {
        user: user2,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.accept({ invitationId: invitation.id }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("listOrganizationInvitations", () => {
    it("should allow admin to list organization invitations", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: admin.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create invitations
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.invitation.createMany({
        data: [
          {
            organizationId: org.id,
            email: faker.internet.email(),
            role: "MEMBER",
            invitedById: admin.id,
            expiresAt,
          },
          {
            organizationId: org.id,
            email: faker.internet.email(),
            role: "MEMBER",
            invitedById: admin.id,
            expiresAt,
          },
        ],
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.listOrganizationInvitations({
        organizationId: org.id,
      });

      expect(result).toHaveLength(2);
    });

    it("should not allow non-admin to list organization invitations", async () => {
      const member = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: member.id,
              role: "MEMBER",
            },
          },
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = invitationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.listOrganizationInvitations({ organizationId: org.id }),
      ).rejects.toThrow(TRPCError);
    });
  });
});

