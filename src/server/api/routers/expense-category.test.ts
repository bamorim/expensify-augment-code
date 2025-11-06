import { describe, it, expect, vi, beforeEach } from "vitest";
import { expenseCategoryRouter } from "./expense-category";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("ExpenseCategoryRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should allow admin to create an expense category", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        name: "Travel",
        description: "Travel expenses",
      });

      expect(result.name).toEqual("Travel");
      expect(result.description).toEqual("Travel expenses");
      expect(result.organizationId).toEqual(org.id);

      // Verify category was created in database
      const category = await db.expenseCategory.findUnique({
        where: { id: result.id },
      });

      expect(category).toBeDefined();
      expect(category?.name).toEqual("Travel");
    });

    it("should reject non-admin from creating expense category", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "MEMBER",
            },
          },
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should prevent duplicate category names within organization", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create first category
      await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      // Try to create duplicate
      await expect(
        caller.create({
          organizationId: org.id,
          name: "Travel",
        }),
      ).rejects.toThrow();
    });

    it("should allow same category name in different organizations", async () => {
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

      const org1 = await db.organization.create({
        data: {
          name: "Org 1",
          members: {
            create: {
              userId: user1.id,
              role: "ADMIN",
            },
          },
        },
      });

      const org2 = await db.organization.create({
        data: {
          name: "Org 2",
          members: {
            create: {
              userId: user2.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create category in org1
      await db.expenseCategory.create({
        data: {
          organizationId: org1.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: user2,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      // Should succeed in org2
      const result = await caller.create({
        organizationId: org2.id,
        name: "Travel",
      });

      expect(result.name).toEqual("Travel");
      expect(result.organizationId).toEqual(org2.id);
    });

    it("should reject empty category name", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          name: "",
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should allow admin to update expense category", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
          description: "Old description",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: category.id,
        name: "Business Travel",
        description: "New description",
      });

      expect(result.name).toEqual("Business Travel");
      expect(result.description).toEqual("New description");
    });

    it("should reject non-admin from updating expense category", async () => {
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const memberUser = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: [
              {
                userId: adminUser.id,
                role: "ADMIN",
              },
              {
                userId: memberUser.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: memberUser,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: category.id,
          name: "Business Travel",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      const user = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: "non-existent-id",
          name: "New Name",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should allow admin to delete expense category", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.delete({ id: category.id });

      expect(result.success).toBe(true);

      // Verify category was deleted
      const deletedCategory = await db.expenseCategory.findUnique({
        where: { id: category.id },
      });

      expect(deletedCategory).toBeNull();
    });

    it("should reject non-admin from deleting expense category", async () => {
      const adminUser = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const memberUser = await db.user.create({
        data: {
          name: "Member User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: [
              {
                userId: adminUser.id,
                role: "ADMIN",
              },
              {
                userId: memberUser.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: memberUser,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: category.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });

  describe("list", () => {
    it("should return all categories for organization members", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "MEMBER",
            },
          },
        },
      });

      // Create multiple categories
      await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Meals",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name).sort()).toEqual(["Meals", "Travel"]);
    });

    it("should only return categories for the specified organization", async () => {
      const user = await db.user.create({
        data: {
          name: "User",
          email: faker.internet.email(),
        },
      });

      const org1 = await db.organization.create({
        data: {
          name: "Org 1",
          members: {
            create: {
              userId: user.id,
              role: "MEMBER",
            },
          },
        },
      });

      const org2 = await db.organization.create({
        data: {
          name: "Org 2",
        },
      });

      // Create category in org1
      await db.expenseCategory.create({
        data: {
          organizationId: org1.id,
          name: "Travel",
        },
      });

      // Create category in org2
      await db.expenseCategory.create({
        data: {
          organizationId: org2.id,
          name: "Meals",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org1.id });

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toEqual("Travel");
    });

    it("should reject non-members from listing categories", async () => {
      const user = await db.user.create({
        data: {
          name: "User",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.list({ organizationId: org.id }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("getById", () => {
    it("should return category details for organization members", async () => {
      const user = await db.user.create({
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
              userId: user.id,
              role: "MEMBER",
            },
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
          description: "Travel expenses",
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: category.id });

      expect(result.id).toEqual(category.id);
      expect(result.name).toEqual("Travel");
      expect(result.description).toEqual("Travel expenses");
    });

    it("should throw NOT_FOUND for non-existent category", async () => {
      const user = await db.user.create({
        data: {
          name: "User",
          email: faker.internet.email(),
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: "non-existent-id" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject non-members from viewing category", async () => {
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

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: {
              userId: user1.id,
              role: "MEMBER",
            },
          },
        },
      });

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: user2,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = expenseCategoryRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.getById({ id: category.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });
});

