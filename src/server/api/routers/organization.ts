import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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

    const organizations = await ctx.db.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Flatten the structure to include role at the top level
    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      role: org.members[0]?.role ?? "MEMBER",
    }));
  }),

  /**
   * Get a specific organization by ID
   * Only accessible to members of the organization
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const organization = await ctx.db.organization.findFirst({
        where: {
          id: input.id,
          members: {
            some: {
              userId,
            },
          },
        },
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
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you don't have access to it",
        });
      }

      // Find current user's membership to determine their role
      const currentUserMembership = organization.members.find(
        (m) => m.userId === userId,
      );

      return {
        ...organization,
        currentUserRole: currentUserMembership?.role,
      };
    }),
});
