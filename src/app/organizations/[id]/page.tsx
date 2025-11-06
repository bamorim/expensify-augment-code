import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganizationDetails } from "~/app/_components/organization-details";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch organization data
  void api.organization.getById.prefetch({ id });
  // Note: We don't prefetch invitations here because it's admin-only
  // The client component will handle fetching it conditionally

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col gap-8 px-4 py-16">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Organization Details
            </h1>
            <Link
              href="/organizations"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
            >
              ← Back to Organizations
            </Link>
          </div>

          <OrganizationDetails organizationId={id} />
        </div>
      </main>
    </HydrateClient>
  );
}

