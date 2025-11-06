import assert from "assert";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, requireOrganizationMembership } from "~/server/api/trpc";

export const organizationRouter = createTRPCRouter({
  /**
   * Create a new organization and automatically assign the creator as admin
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, "Organization name is required") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Create organization and add creator as admin in a transaction
      const organization = await ctx.db.organization.create({
        data: {
          name: input.name,
          members: {
            create: {
              userId,
              role: "ADMIN",
            },
          },
        },
        include: {
          members: {
            where: { userId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return organization;
    }),

  /**
   * List all organizations the current user belongs to
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Query by membership first - more efficient and ensures we have the user's role
    const memberships = await ctx.db.organizationMember.findMany({
      where: {
        userId,
      },
      include: {
        organization: true,
      },
      orderBy: {
        organization: {
          createdAt: "desc",
        },
      },
    });

    // Map to the expected format with role from membership
    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
      role: membership.role,
    }));
  }),

  /**
   * Get a specific organization by ID
   * Only accessible to members of the organization
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await requireOrganizationMembership(ctx, input.id);

      const org = await ctx.db.organization.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      assert(org, "if the membership exists, org must exist as well")

      return {
        ...org,
        currentUserRole: membership.role,
      };
    }),
});
