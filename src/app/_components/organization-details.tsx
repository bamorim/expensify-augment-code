"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ExpenseCategories } from "./expense-categories";
import { Policies } from "./policies";

export function OrganizationDetails({
  organizationId,
}: {
  organizationId: string;
}) {
  const [organization] = api.organization.getById.useSuspenseQuery({
    id: organizationId,
  });

  const isAdmin = organization.currentUserRole === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      {/* Organization Info */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">{organization.name}</h2>
        <p className="text-white/60">
          Created {new Date(organization.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Members List */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Members</h2>
        <div className="flex flex-col gap-3">
          {organization.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg bg-white/5 p-4"
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">
                  {member.user.name ?? member.user.email}
                </h3>
                <p className="text-sm text-white/60">{member.user.email}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <ExpenseCategories organizationId={organizationId} isAdmin={isAdmin} />

      {/* Policies */}
      <Policies organizationId={organizationId} isAdmin={isAdmin} />

      {/* Invite Section (Admin Only) */}
      {isAdmin && <InviteUserSection organizationId={organizationId} />}

      {/* Invitations List (Admin Only) */}
      {isAdmin && <InvitationsList organizationId={organizationId} />}
    </div>
  );
}

function InviteUserSection({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [showForm, setShowForm] = useState(false);
  const utils = api.useUtils();

  const inviteUser = api.invitation.invite.useMutation({
    onSuccess: async () => {
      await utils.invitation.listOrganizationInvitations.invalidate({
        organizationId,
      });
      setEmail("");
      setRole("MEMBER");
      setShowForm(false);
    },
  });

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Invite User</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
          >
            + Invite User
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteUser.mutate({ organizationId, email, role });
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="invite-role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              className="rounded-lg bg-white/10 px-4 py-2 text-white"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20 disabled:opacity-50"
              disabled={inviteUser.isPending || !email.trim()}
            >
              {inviteUser.isPending ? "Sending..." : "Send Invitation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEmail("");
                setRole("MEMBER");
              }}
              className="rounded-full bg-white/5 px-6 py-2 font-semibold transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>

          {inviteUser.error && (
            <p className="text-sm text-red-400">
              Error: {inviteUser.error.message}
            </p>
          )}

          {inviteUser.isSuccess && (
            <p className="text-sm text-green-400">
              Invitation sent successfully!
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function InvitationsList({ organizationId }: { organizationId: string }) {
  const { data: invitations, isLoading, error } = api.invitation.listOrganizationInvitations.useQuery({
    organizationId,
  });

  // Don't show anything if there's an error (likely not an admin)
  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Pending Invitations</h2>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <h2 className="mb-4 text-2xl font-bold">Pending Invitations</h2>
      <div className="flex flex-col gap-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between rounded-lg bg-white/5 p-4"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">{invitation.email}</h3>
              <p className="text-sm text-white/60">
                Invited by {invitation.invitedBy.name ?? invitation.invitedBy.email} •{" "}
                {new Date(invitation.createdAt).toLocaleDateString()} •
                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                {invitation.role}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  invitation.status === "PENDING"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : invitation.status === "ACCEPTED"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                }`}
              >
                {invitation.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

