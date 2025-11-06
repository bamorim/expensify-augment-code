import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganizationList } from "~/app/_components/organization-list";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function OrganizationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Prefetch organizations for the client component
  void api.organization.list.prefetch();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col gap-8 px-4 py-16">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Organizations
            </h1>
            <Link
              href="/"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
            >
              ← Home
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-lg text-white/80">
              Logged in as {session.user.name ?? session.user.email}
            </p>
          </div>

          <OrganizationList />
        </div>
      </main>
    </HydrateClient>
  );
}

