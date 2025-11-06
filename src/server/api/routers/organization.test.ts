import { describe, it, expect, vi, beforeEach } from "vitest";
import { organizationRouter } from "./organization";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

// Mock the database to use the transactional testing wrapper
vi.mock("~/server/db");

// Mock the auth module
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

const mockAuth = vi.mocked(auth);

describe("OrganizationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create an organization and assign creator as admin", async () => {
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.create({ name: "Test Organization" });

      expect(result.name).toEqual("Test Organization");
      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.userId).toEqual(user.id);
      expect(result.members[0]?.role).toEqual("ADMIN");

      // Verify organization was created in database
      const org = await db.organization.findUnique({
        where: { id: result.id },
        include: { members: true },
      });

      expect(org).toBeDefined();
      expect(org?.members).toHaveLength(1);
      expect(org?.members[0]?.role).toEqual("ADMIN");
    });

    it("should reject empty organization name", async () => {
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.create({ name: "" })).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("should return only organizations the user belongs to", async () => {
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

      // Create organization for user1
      const org1 = await db.organization.create({
        data: {
          name: "User 1 Org",
          members: {
            create: {
              userId: user1.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create organization for user2
      const org2 = await db.organization.create({
        data: {
          name: "User 2 Org",
          members: {
            create: {
              userId: user2.id,
              role: "ADMIN",
            },
          },
        },
      });

      // Create shared organization
      const sharedOrg = await db.organization.create({
        data: {
          name: "Shared Org",
          members: {
            create: [
              {
                userId: user1.id,
                role: "ADMIN",
              },
              {
                userId: user2.id,
                role: "MEMBER",
              },
            ],
          },
        },
      });

      const mockSession = {
        user: user1,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.list();

      // User1 should see org1 and sharedOrg, but not org2
      expect(result).toHaveLength(2);
      expect(result.map((o) => o.id).sort()).toEqual(
        [org1.id, sharedOrg.id].sort(),
      );

      // Check roles are correct
      const org1Result = result.find((o) => o.id === org1.id);
      expect(org1Result?.role).toEqual("ADMIN");

      const sharedOrgResult = result.find((o) => o.id === sharedOrg.id);
      expect(sharedOrgResult?.role).toEqual("ADMIN");
    });

    it("should return empty array when user has no organizations", async () => {
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.list();

      expect(result).toHaveLength(0);
    });
  });

  describe("getById", () => {
    it("should return organization details for members", async () => {
      const user = await db.user.create({
        data: {
          name: "Test User",
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      const result = await caller.getById({ id: org.id });

      expect(result.id).toEqual(org.id);
      expect(result.name).toEqual("Test Org");
      expect(result.members).toHaveLength(1);
      expect(result.members[0]?.userId).toEqual(user.id);
      expect(result.members[0]?.role).toEqual("ADMIN");
    });

    it("should throw NOT_FOUND for non-existent organization", async () => {
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

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(
        caller.getById({ id: "non-existent-id" }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND when user is not a member", async () => {
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
          name: "User 1 Org",
          members: {
            create: {
              userId: user1.id,
              role: "ADMIN",
            },
          },
        },
      });

      const mockSession = {
        user: user2,
        expires: "2030-12-31T23:59:59.999Z",
      };

      const caller = organizationRouter.createCaller({
        db: db,
        session: mockSession,
        headers: new Headers(),
      });

      await expect(caller.getById({ id: org.id })).rejects.toThrow(TRPCError);
    });
  });
});

