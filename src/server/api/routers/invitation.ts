import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { sendInvitationEmail } from "~/server/services/email";

export const invitationRouter = createTRPCRouter({
  /**
   * Invite a user to an organization (admin only)
   */
  invite: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email("Invalid email address"),
        role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the current user is an admin of the organization
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
        include: {
          organization: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you don't have access to it",
        });
      }

      if (membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite users to the organization",
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: input.email, // This won't work - we need to check by email
            organizationId: input.organizationId,
          },
        },
      });

      // Better approach: check if a user with this email exists and is already a member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: {
          organizationMembers: {
            where: { organizationId: input.organizationId },
          },
        },
      });

      if (existingUser?.organizationMembers.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this organization",
        });
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.invitation.findFirst({
        where: {
          organizationId: input.organizationId,
          email: input.email,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email",
        });
      }

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await ctx.db.invitation.create({
        data: {
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          invitedById: userId,
          expiresAt,
        },
        include: {
          organization: true,
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Send invitation email
      try {
        await sendInvitationEmail({
          to: input.email,
          organizationName: invitation.organization.name,
          invitedByName: invitation.invitedBy.name ?? invitation.invitedBy.email ?? "Someone",
          invitationId: invitation.id,
        });
      } catch (error) {
        // Log error but don't fail the invitation creation
        console.error("Failed to send invitation email:", error);
        // In production, you might want to queue this for retry
      }

      return invitation;
    }),

  /**
   * List pending invitations for the current user's email
   */
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const userEmail = ctx.session.user.email;

    if (!userEmail) {
      return [];
    }

    const invitations = await ctx.db.invitation.findMany({
      where: {
        email: userEmail,
        status: "PENDING",
        expiresAt: {
          gt: new Date(), // Only show non-expired invitations
        },
      },
      include: {
        organization: true,
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return invitations;
  }),

  /**
   * Get a specific invitation by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userEmail = ctx.session.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User email not found",
        });
      }

      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.id,
          email: userEmail,
        },
        include: {
          organization: true,
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or not for your email",
        });
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      if (invitation.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been processed",
        });
      }

      return invitation;
    }),

  /**
   * Accept an invitation and join the organization
   */
  accept: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userEmail = ctx.session.user.email;

      if (!userEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User email not found",
        });
      }

      // Find the invitation
      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.invitationId,
          email: userEmail,
          status: "PENDING",
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or already processed",
        });
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        // Mark as expired
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      // Check if user is already a member
      const existingMember = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this organization",
        });
      }

      // Accept invitation and create membership in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Update invitation status
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" },
        });

        // Create organization membership
        const member = await tx.organizationMember.create({
          data: {
            userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
          include: {
            organization: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return member;
      });

      return result;
    }),

  /**
   * List all invitations for an organization (admin only)
   */
  listOrganizationInvitations: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the current user is an admin of the organization
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you don't have access to it",
        });
      }

      if (membership.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view organization invitations",
        });
      }

      const invitations = await ctx.db.invitation.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return invitations;
    }),
});

