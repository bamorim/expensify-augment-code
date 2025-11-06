"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function OrganizationList() {
  const [organizations] = api.organization.list.useSuspenseQuery();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createOrganization = api.organization.create.useMutation({
    onSuccess: async () => {
      await utils.organization.invalidate();
      setName("");
      setShowForm(false);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Create Organization Section */}
      <div className="rounded-xl bg-white/10 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New Organization</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
            >
              + New Organization
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createOrganization.mutate({ name });
            }}
            className="mt-4 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="org-name" className="text-sm font-medium">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                placeholder="Enter organization name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
                required
                minLength={1}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20 disabled:opacity-50"
                disabled={createOrganization.isPending || !name.trim()}
              >
                {createOrganization.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setName("");
                }}
                className="rounded-full bg-white/5 px-6 py-2 font-semibold transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            {createOrganization.error && (
              <p className="text-sm text-red-400">
                Error: {createOrganization.error.message}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Organizations List */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Your Organizations</h2>

        {organizations.length === 0 ? (
          <p className="text-white/60">
            You don&apos;t belong to any organizations yet. Create one to get
            started!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg bg-white/5 p-4 transition hover:bg-white/10"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{org.name}</h3>
                  <p className="text-sm text-white/60">
                    Role: {org.role} • Created{" "}
                    {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/organizations/${org.id}`}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
                >
                  View Details
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

