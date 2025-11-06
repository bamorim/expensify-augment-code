"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type PolicyPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

const ORG_WIDE_GUARD = "ORG-WIDE" as const;

export function Policies({
  organizationId,
  isAdmin,
}: {
  organizationId: string;
  isAdmin: boolean;
}) {
  const { data: policies, isLoading: policiesLoading } = api.policy.list.useQuery(
    { organizationId },
    { enabled: isAdmin }
  );
  const { data: categories, isLoading: categoriesLoading } = api.expenseCategory.list.useQuery(
    { organizationId },
    { enabled: isAdmin }
  );

  // Don't render anything if not admin
  if (!isAdmin) {
    return null;
  }

  if (policiesLoading || categoriesLoading) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Expense Policies</h2>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (!policies || !categories) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create Policy Section */}
      <CreatePolicySection
        organizationId={organizationId}
        categories={categories}
      />

      {/* Policies List */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Expense Policies</h2>

        {policies.length === 0 ? (
          <p className="text-white/60">
            No policies yet. Create one to get started!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {policies.map((policy) => (
              <PolicyItem
                key={policy.id}
                policy={policy}
                organizationId={organizationId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePolicySection({
  organizationId,
  categories,
}: {
  organizationId: string;
  categories: Array<{ id: string; name: string }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [userId, setUserId] = useState<string>(ORG_WIDE_GUARD);
  const [maxAmount, setMaxAmount] = useState("");
  const [period, setPeriod] = useState<PolicyPeriod>("MONTHLY");
  const [requiresReview, setRequiresReview] = useState(false);
  const utils = api.useUtils();

  // Fetch organization members for the dropdown
  const { data: organization } = api.organization.getById.useQuery({
    id: organizationId,
  });

  const createPolicy = api.policy.create.useMutation({
    onSuccess: async () => {
      await utils.policy.list.invalidate({ organizationId });
      setCategoryId("");
      setUserId(ORG_WIDE_GUARD);
      setMaxAmount("");
      setPeriod("MONTHLY");
      setRequiresReview(false);
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInCents = Math.round(parseFloat(maxAmount) * 100);
    createPolicy.mutate({
      organizationId,
      categoryId,
      ...(userId === ORG_WIDE_GUARD ? {} : { userId }),
      maxAmount: amountInCents,
      period,
      requiresReview,
    });
  };

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Policies</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
          >
            + New Policy
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="policy-category" className="text-sm font-medium">
              Category *
            </label>
            <select
              id="policy-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="policy-user" className="text-sm font-medium">
              Apply To
            </label>
            <select
              id="policy-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white"
              required
            >
              <option value={ORG_WIDE_GUARD}>Organization-wide</option>
              {organization?.members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name ?? member.user.email} ({member.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="policy-amount" className="text-sm font-medium">
              Max Amount (in dollars) *
            </label>
            <input
              id="policy-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 500.00"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="policy-period" className="text-sm font-medium">
              Period *
            </label>
            <select
              id="policy-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PolicyPeriod)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white"
              required
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="policy-review"
              type="checkbox"
              checked={requiresReview}
              onChange={(e) => setRequiresReview(e.target.checked)}
              className="h-5 w-5 rounded"
            />
            <label htmlFor="policy-review" className="text-sm font-medium">
              Requires manual review (even if under limit)
            </label>
          </div>

          {createPolicy.error && (
            <p className="text-sm text-red-400">{createPolicy.error.message}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createPolicy.isPending}
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20 disabled:opacity-50"
            >
              {createPolicy.isPending ? "Creating..." : "Create Policy"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full bg-white/5 px-6 py-2 font-semibold transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PolicyItem({
  policy,
  organizationId,
}: {
  policy: {
    id: string;
    categoryId: string;
    userId: string | null;
    maxAmount: number;
    period: string;
    requiresReview: boolean;
    category: { id: string; name: string };
    user: { id: string; name: string | null; email: string | null } | null;
  };
  organizationId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [maxAmount, setMaxAmount] = useState(
    (policy.maxAmount / 100).toFixed(2),
  );
  const [period, setPeriod] = useState<PolicyPeriod>(
    policy.period as PolicyPeriod,
  );
  const [requiresReview, setRequiresReview] = useState(policy.requiresReview);
  const utils = api.useUtils();

  const updatePolicy = api.policy.update.useMutation({
    onSuccess: async () => {
      await utils.policy.list.invalidate({ organizationId });
      setIsEditing(false);
    },
  });

  const deletePolicy = api.policy.delete.useMutation({
    onSuccess: async () => {
      await utils.policy.list.invalidate({ organizationId });
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInCents = Math.round(parseFloat(maxAmount) * 100);
    updatePolicy.mutate({
      id: policy.id,
      maxAmount: amountInCents,
      period,
      requiresReview,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this policy?")) {
      deletePolicy.mutate({ id: policy.id });
    }
  };

  const policyType = policy.userId ? "User-Specific" : "Organization-Wide";
  const policyScope = policy.userId
    ? `${policy.user?.name ?? policy.user?.email ?? "Unknown User"}`
    : "All Members";

  if (isEditing) {
    return (
      <form
        onSubmit={handleUpdate}
        className="rounded-lg bg-white/5 p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{policy.category.name}</h3>
            <p className="text-sm text-white/60">
              {policyType} - {policyScope}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Max Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="rounded bg-white/10 px-3 py-1 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PolicyPeriod)}
              className="rounded bg-white/10 px-3 py-1 text-sm"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={requiresReview}
              onChange={(e) => setRequiresReview(e.target.checked)}
              className="h-4 w-4"
            />
            <label className="text-xs text-white/60">Requires Review</label>
          </div>
        </div>

        {updatePolicy.error && (
          <p className="text-xs text-red-400">{updatePolicy.error.message}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={updatePolicy.isPending}
            className="rounded bg-white/10 px-4 py-1 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
          >
            {updatePolicy.isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded bg-white/5 px-4 py-1 text-sm font-semibold transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg bg-white/5 p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold">{policy.category.name}</h3>
        <p className="text-sm text-white/60">
          {policyType} - {policyScope}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">${(policy.maxAmount / 100).toFixed(2)}</span> per{" "}
          {policy.period.toLowerCase()} •{" "}
          {policy.requiresReview ? "Manual Review" : "Auto-Approve"}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deletePolicy.isPending}
          className="rounded bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
        >
          {deletePolicy.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

