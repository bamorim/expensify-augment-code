import { describe, it, expect, vi, beforeEach } from "vitest";
import { policyRouter } from "./policy";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

describe("PolicyRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should allow admin to create an organization-wide policy", async () => {
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        categoryId: category.id,
        maxAmount: 50000, // $500.00 in cents
        period: "MONTHLY",
        requiresReview: false,
      });

      expect(result.organizationId).toEqual(org.id);
      expect(result.categoryId).toEqual(category.id);
      expect(result.userId).toBeNull();
      expect(result.maxAmount).toEqual(50000);
      expect(result.period).toEqual("MONTHLY");
      expect(result.requiresReview).toEqual(false);
      expect(result.category).toBeDefined();
      expect(result.category.name).toEqual("Travel");
    });

    it("should allow admin to create a user-specific policy", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

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
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: member.id,
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
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({
        organizationId: org.id,
        categoryId: category.id,
        userId: member.id,
        maxAmount: 100000, // $1000.00 in cents
        period: "WEEKLY",
        requiresReview: true,
      });

      expect(result.userId).toEqual(member.id);
      expect(result.maxAmount).toEqual(100000);
      expect(result.period).toEqual("WEEKLY");
      expect(result.requiresReview).toEqual(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toEqual(member.id);
    });

    it("should reject non-admin from creating policy", async () => {
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
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject policy creation for non-existent category", async () => {
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: "non-existent-category-id",
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        }),
      ).rejects.toThrow("Expense category not found");
    });

    it("should reject policy creation for user not in organization", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

      const outsideUser = await db.user.create({
        data: {
          name: "Outside User",
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

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.create({
          organizationId: org.id,
          categoryId: category.id,
          userId: outsideUser.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        }),
      ).rejects.toThrow("User is not a member of this organization");
    });
  });

  describe("update", () => {
    it("should allow admin to update a policy", async () => {
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

      const policy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.update({
        id: policy.id,
        maxAmount: 75000,
        requiresReview: true,
      });

      expect(result.maxAmount).toEqual(75000);
      expect(result.requiresReview).toEqual(true);
      expect(result.period).toEqual("MONTHLY"); // unchanged
    });

    it("should reject non-admin from updating policy", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

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
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: member.id,
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

      const policy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.update({
          id: policy.id,
          maxAmount: 75000,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should allow admin to delete a policy", async () => {
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

      const policy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.delete({ id: policy.id });

      expect(result.success).toEqual(true);

      // Verify policy was deleted
      const deletedPolicy = await db.policy.findUnique({
        where: { id: policy.id },
      });

      expect(deletedPolicy).toBeNull();
    });

    it("should reject non-admin from deleting policy", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

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
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: member.id,
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

      const policy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.delete({ id: policy.id })).rejects.toThrow(TRPCError);
    });
  });

  describe("list", () => {
    it("should allow admin to list all policies for organization", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

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
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: member.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      const category1 = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const category2 = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Meals",
        },
      });

      // Create org-wide policy for Travel
      await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category1.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      // Create user-specific policy for Travel
      await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category1.id,
          userId: member.id,
          maxAmount: 100000,
          period: "WEEKLY",
          requiresReview: true,
        },
      });

      // Create org-wide policy for Meals
      await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category2.id,
          maxAmount: 2500,
          period: "DAILY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.list({ organizationId: org.id });

      expect(result).toHaveLength(3);
      expect(result[0]?.category).toBeDefined();
      expect(result.some((p) => p.userId === null)).toBe(true); // has org-wide
      expect(result.some((p) => p.userId === member.id)).toBe(true); // has user-specific
    });

    it("should reject non-admin from listing policies", async () => {
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

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.list({ organizationId: org.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });

  describe("getApplicablePolicy - Policy Resolution Logic", () => {
    it("should return user-specific policy when it exists (precedence test)", async () => {
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

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      // Create org-wide policy
      await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      // Create user-specific policy (should take precedence)
      const userPolicy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          userId: member.id,
          maxAmount: 100000,
          period: "WEEKLY",
          requiresReview: true,
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getApplicablePolicy({
        organizationId: org.id,
        categoryId: category.id,
      });

      expect(result.type).toEqual("USER_SPECIFIC");
      expect(result.policy?.id).toEqual(userPolicy.id);
      expect(result.policy?.maxAmount).toEqual(100000);
      expect(result.policy?.period).toEqual("WEEKLY");
    });

    it("should return org-wide policy when no user-specific policy exists", async () => {
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

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      // Create only org-wide policy
      const orgPolicy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          maxAmount: 50000,
          period: "MONTHLY",
          requiresReview: false,
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getApplicablePolicy({
        organizationId: org.id,
        categoryId: category.id,
      });

      expect(result.type).toEqual("ORGANIZATION_WIDE");
      expect(result.policy?.id).toEqual(orgPolicy.id);
      expect(result.policy?.maxAmount).toEqual(50000);
    });

    it("should return null when no policy exists", async () => {
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

      const category = await db.expenseCategory.create({
        data: {
          organizationId: org.id,
          name: "Travel",
        },
      });

      const mockSession = {
        user: member,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getApplicablePolicy({
        organizationId: org.id,
        categoryId: category.id,
      });

      expect(result.type).toEqual("NONE");
      expect(result.policy).toBeNull();
    });

    it("should allow admin to check policy for another user", async () => {
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: faker.internet.email(),
        },
      });

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
            create: [
              {
                userId: admin.id,
                role: "ADMIN",
              },
              {
                userId: member.id,
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

      // Create user-specific policy for member
      const memberPolicy = await db.policy.create({
        data: {
          organizationId: org.id,
          categoryId: category.id,
          userId: member.id,
          maxAmount: 100000,
          period: "WEEKLY",
          requiresReview: true,
        },
      });

      const mockSession = {
        user: admin,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getApplicablePolicy({
        organizationId: org.id,
        categoryId: category.id,
        userId: member.id,
      });

      expect(result.type).toEqual("USER_SPECIFIC");
      expect(result.policy?.id).toEqual(memberPolicy.id);
    });

    it("should reject non-admin from checking policy for another user", async () => {
      const member1 = await db.user.create({
        data: {
          name: "Member 1",
          email: faker.internet.email(),
        },
      });

      const member2 = await db.user.create({
        data: {
          name: "Member 2",
          email: faker.internet.email(),
        },
      });

      const org = await db.organization.create({
        data: {
          name: "Test Org",
          members: {
            create: [
              {
                userId: member1.id,
                role: "MEMBER",
              },
              {
                userId: member2.id,
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
        user: member1,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = policyRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.getApplicablePolicy({
          organizationId: org.id,
          categoryId: category.id,
          userId: member2.id,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
