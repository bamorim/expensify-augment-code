import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  requireOrganizationAdmin,
  requireOrganizationMembership,
} from "~/server/api/trpc";

// Zod enum for PolicyPeriod
const policyPeriodEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

export const policyRouter = createTRPCRouter({
  /**
   * Create a new policy (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        categoryId: z.string(),
        userId: z.string().optional(), // null/undefined = org-wide, string = user-specific
        maxAmount: z.number().int().positive("Max amount must be positive"),
        period: policyPeriodEnum,
        requiresReview: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if the current user is an admin of the organization
      await requireOrganizationAdmin(ctx, input.organizationId);

      // Verify the category exists and belongs to the organization
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.categoryId },
      });

      if (!category || category.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found in this organization",
        });
      }

      // If userId is provided, verify the user is a member of the organization
      if (input.userId) {
        const userMembership = await ctx.db.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: input.userId,
              organizationId: input.organizationId,
            },
          },
        });

        if (!userMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User is not a member of this organization",
          });
        }
      }

      // Create the policy
      const policy = await ctx.db.policy.create({
        data: {
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          userId: input.userId ?? null,
          maxAmount: input.maxAmount,
          period: input.period,
          requiresReview: input.requiresReview,
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return policy;
    }),

  /**
   * Update a policy (admin only)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        maxAmount: z.number().int().positive("Max amount must be positive").optional(),
        period: policyPeriodEnum.optional(),
        requiresReview: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the policy to check organization membership
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check if the current user is an admin of the organization
      await requireOrganizationAdmin(ctx, policy.organizationId);

      // Update the policy
      const updatedPolicy = await ctx.db.policy.update({
        where: { id: input.id },
        data: {
          ...(input.maxAmount !== undefined && { maxAmount: input.maxAmount }),
          ...(input.period !== undefined && { period: input.period }),
          ...(input.requiresReview !== undefined && { requiresReview: input.requiresReview }),
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedPolicy;
    }),

  /**
   * Delete a policy (admin only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the policy to check organization membership
      const policy = await ctx.db.policy.findUnique({
        where: { id: input.id },
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check if the current user is an admin of the organization
      await requireOrganizationAdmin(ctx, policy.organizationId);

      // Delete the policy
      await ctx.db.policy.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * List all policies for an organization (admin only)
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if the current user is an admin of the organization
      await requireOrganizationAdmin(ctx, input.organizationId);

      // Get all policies for the organization
      const policies = await ctx.db.policy.findMany({
        where: { organizationId: input.organizationId },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { categoryId: "asc" },
          { userId: "asc" }, // org-wide (null) first, then user-specific
        ],
      });

      return policies;
    }),

  /**
   * Get the applicable policy for a user/category combination
   * This implements the policy resolution logic:
   * 1. Check for user-specific policy first
   * 2. Fall back to organization-wide policy
   * 3. Return null if no policy exists
   */
  getApplicablePolicy: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        categoryId: z.string(),
        userId: z.string().optional(), // defaults to current user if not provided
      }),
    )
    .query(async ({ ctx, input }) => {
      // Check if the current user is a member of the organization
      await requireOrganizationMembership(ctx, input.organizationId);

      // Use provided userId or default to current user
      const targetUserId = input.userId ?? ctx.session.user.id;

      // If a specific userId is provided (not current user), verify admin access
      if (input.userId && input.userId !== ctx.session.user.id) {
        await requireOrganizationAdmin(ctx, input.organizationId);
      }

      // Verify the category exists and belongs to the organization
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.categoryId },
      });

      if (!category || category.organizationId !== input.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found in this organization",
        });
      }

      // Step 1: Check for user-specific policy
      const userSpecificPolicy = await ctx.db.policy.findUnique({
        where: {
          organizationId_categoryId_userId: {
            organizationId: input.organizationId,
            categoryId: input.categoryId,
            userId: targetUserId,
          },
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (userSpecificPolicy) {
        return { policy: userSpecificPolicy, type: "USER_SPECIFIC" as const };
      }

      // Step 2: Fall back to organization-wide policy
      // Note: Prisma doesn't allow null in unique constraint queries, so we use findFirst
      const orgWidePolicy = await ctx.db.policy.findFirst({
        where: {
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          userId: null,
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (orgWidePolicy) {
        return { policy: orgWidePolicy, type: "ORGANIZATION_WIDE" as const };
      }

      // Step 3: No policy exists
      return { policy: null, type: "NONE" as const };
    }),
});

