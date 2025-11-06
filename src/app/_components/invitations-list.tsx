"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function InvitationsList() {
  const [invitations] = api.invitation.listInvitations.useSuspenseQuery();
  const utils = api.useUtils();
  const router = useRouter();

  const acceptInvitation = api.invitation.accept.useMutation({
    onSuccess: async () => {
      await utils.invitation.listInvitations.invalidate();
      await utils.organization.list.invalidate();
      // Redirect to organizations page after accepting
      router.push("/organizations");
    },
  });

  if (invitations.length === 0) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <p className="text-white/60">
          You don&apos;t have any pending invitations at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <h2 className="mb-4 text-2xl font-bold">Pending Invitations</h2>
      <div className="flex flex-col gap-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-lg bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold">
                    {invitation.organization.name}
                  </h3>
                  <p className="text-white/80">
                    <span className="font-medium">
                      {invitation.invitedBy.name ?? invitation.invitedBy.email}
                    </span>{" "}
                    invited you to join as a{" "}
                    <span className="font-medium">{invitation.role}</span>
                  </p>
                  <p className="text-sm text-white/60">
                    Invited on{" "}
                    {new Date(invitation.createdAt).toLocaleDateString()} •
                    Expires on{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {invitation.role}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    acceptInvitation.mutate({ invitationId: invitation.id })
                  }
                  disabled={acceptInvitation.isPending}
                  className="rounded-full bg-green-600 px-6 py-2 font-semibold transition hover:bg-green-700 disabled:opacity-50"
                >
                  {acceptInvitation.isPending ? "Accepting..." : "Accept"}
                </button>
              </div>

              {acceptInvitation.error && (
                <p className="text-sm text-red-400">
                  Error: {acceptInvitation.error.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

