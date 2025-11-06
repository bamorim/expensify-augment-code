import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const expenseCategoryRouter = createTRPCRouter({
  /**
   * Create a new expense category (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1, "Category name is required"),
        description: z.string().optional(),
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
          message: "Only admins can create expense categories",
        });
      }

      // Create the expense category
      const category = await ctx.db.expenseCategory.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
        },
      });

      return category;
    }),

  /**
   * Update an expense category (admin only)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Category name is required").optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the category to check organization membership
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
        });
      }

      // Check if the current user is an admin of the organization
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: category.organizationId,
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
          message: "Only admins can update expense categories",
        });
      }

      // Update the category
      const updatedCategory = await ctx.db.expenseCategory.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      return updatedCategory;
    }),

  /**
   * Delete an expense category (admin only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the category to check organization membership
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
        });
      }

      // Check if the current user is an admin of the organization
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: category.organizationId,
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
          message: "Only admins can delete expense categories",
        });
      }

      // Delete the category
      await ctx.db.expenseCategory.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * List all expense categories for an organization (all members)
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if the current user is a member of the organization
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

      // Get all categories for the organization
      const categories = await ctx.db.expenseCategory.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          name: "asc",
        },
      });

      return categories;
    }),

  /**
   * Get a specific expense category by ID (all members)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the category
      const category = await ctx.db.expenseCategory.findUnique({
        where: { id: input.id },
      });

      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense category not found",
        });
      }

      // Check if the current user is a member of the organization
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: category.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found or you don't have access to it",
        });
      }

      return category;
    }),
});

