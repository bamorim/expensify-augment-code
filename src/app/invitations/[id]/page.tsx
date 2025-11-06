import Link from "next/link";
import { redirect } from "next/navigation";

import { InvitationAccept } from "~/app/_components/invitation-accept";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function InvitationAcceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=/invitations/${id}`);
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col gap-8 px-4 py-16">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Accept Invitation
            </h1>
            <Link
              href="/invitations"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
            >
              ← All Invitations
            </Link>
          </div>

          <InvitationAccept invitationId={id} />
        </div>
      </main>
    </HydrateClient>
  );
}

