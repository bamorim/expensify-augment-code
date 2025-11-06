"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function InvitationAccept({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: invitation, error: fetchError } = api.invitation.getById.useQuery(
    { id: invitationId },
  );

  const acceptInvitation = api.invitation.accept.useMutation({
    onSuccess: async () => {
      await utils.invitation.listInvitations.invalidate();
      await utils.organization.list.invalidate();
      // Redirect to organizations page after accepting
      router.push("/organizations");
    },
  });

  if (fetchError) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold text-red-400">Error</h2>
        <p className="text-white/80">{fetchError.message}</p>
        <div className="mt-4">
          <a
            href="/invitations"
            className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
          >
            View All Invitations
          </a>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <p className="text-white/60">Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <h2 className="mb-6 text-2xl font-bold">Invitation Details</h2>

      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white/5 p-6">
        <div>
          <p className="text-sm text-white/60">Organization</p>
          <p className="text-xl font-semibold">{invitation.organization.name}</p>
        </div>

        <div>
          <p className="text-sm text-white/60">Invited by</p>
          <p className="text-lg">
            {invitation.invitedBy.name ?? invitation.invitedBy.email}
          </p>
        </div>

        <div>
          <p className="text-sm text-white/60">Role</p>
          <p className="text-lg font-medium">{invitation.role}</p>
        </div>

        <div>
          <p className="text-sm text-white/60">Invited on</p>
          <p className="text-lg">
            {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div>
          <p className="text-sm text-white/60">Expires on</p>
          <p className="text-lg">
            {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => acceptInvitation.mutate({ invitationId })}
          disabled={acceptInvitation.isPending}
          className="rounded-full bg-green-600 px-8 py-3 font-semibold transition hover:bg-green-700 disabled:opacity-50"
        >
          {acceptInvitation.isPending ? "Accepting..." : "Accept Invitation"}
        </button>
        <a
          href="/invitations"
          className="rounded-full bg-white/5 px-8 py-3 font-semibold transition hover:bg-white/10"
        >
          View All Invitations
        </a>
      </div>

      {acceptInvitation.error && (
        <p className="mt-4 text-sm text-red-400">
          Error: {acceptInvitation.error.message}
        </p>
      )}

      {acceptInvitation.isSuccess && (
        <p className="mt-4 text-sm text-green-400">
          Invitation accepted! Redirecting...
        </p>
      )}
    </div>
  );
}

