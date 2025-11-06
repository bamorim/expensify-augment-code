"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function ExpenseCategories({
  organizationId,
  isAdmin,
}: {
  organizationId: string;
  isAdmin: boolean;
}) {
  const { data: categories, isLoading } = api.expenseCategory.list.useQuery({
    organizationId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Expense Categories</h2>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (!categories) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create Category Section (Admin Only) */}
      {isAdmin && <CreateCategorySection organizationId={organizationId} />}

      {/* Categories List */}
      <div className="rounded-xl bg-white/10 p-6">
        <h2 className="mb-4 text-2xl font-bold">Expense Categories</h2>

        {categories.length === 0 ? (
          <p className="text-white/60">
            No expense categories yet.
            {isAdmin && " Create one to get started!"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                organizationId={organizationId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCategorySection({
  organizationId,
}: {
  organizationId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const utils = api.useUtils();

  const createCategory = api.expenseCategory.create.useMutation({
    onSuccess: async () => {
      await utils.expenseCategory.list.invalidate({ organizationId });
      setName("");
      setDescription("");
      setShowForm(false);
    },
  });

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Categories</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
          >
            + New Category
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCategory.mutate({ organizationId, name, description });
          }}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="category-name" className="text-sm font-medium">
              Category Name
            </label>
            <input
              id="category-name"
              type="text"
              placeholder="e.g., Travel, Meals, Office Supplies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
              required
              minLength={1}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="category-description" className="text-sm font-medium">
              Description (Optional)
            </label>
            <textarea
              id="category-description"
              placeholder="Brief description of this category"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20 disabled:opacity-50"
              disabled={createCategory.isPending || !name.trim()}
            >
              {createCategory.isPending ? "Creating..." : "Create Category"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setDescription("");
              }}
              className="rounded-full bg-white/5 px-6 py-2 font-semibold transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>

          {createCategory.error && (
            <p className="text-sm text-red-400">
              Error: {createCategory.error.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function CategoryItem({
  category,
  organizationId,
  isAdmin,
}: {
  category: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  };
  organizationId: string;
  isAdmin: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const utils = api.useUtils();

  const updateCategory = api.expenseCategory.update.useMutation({
    onSuccess: async () => {
      await utils.expenseCategory.list.invalidate({ organizationId });
      setIsEditing(false);
    },
  });

  const deleteCategory = api.expenseCategory.delete.useMutation({
    onSuccess: async () => {
      await utils.expenseCategory.list.invalidate({ organizationId });
    },
  });

  if (isEditing && isAdmin) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateCategory.mutate({ id: category.id, name, description });
        }}
        className="rounded-lg bg-white/5 p-4"
      >
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg bg-white/10 px-3 py-2 text-white"
            required
            minLength={1}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg bg-white/10 px-3 py-2 text-white"
            rows={2}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
              disabled={updateCategory.isPending || !name.trim()}
            >
              {updateCategory.isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(category.name);
                setDescription(category.description ?? "");
              }}
              className="rounded-full bg-white/5 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
          {updateCategory.error && (
            <p className="text-sm text-red-400">
              Error: {updateCategory.error.message}
            </p>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between rounded-lg bg-white/5 p-4 transition hover:bg-white/10">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{category.name}</h3>
        {category.description && (
          <p className="text-sm text-white/70">{category.description}</p>
        )}
        <p className="text-xs text-white/50">
          Created {new Date(category.createdAt).toLocaleDateString()}
        </p>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/20"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  `Are you sure you want to delete the category "${category.name}"?`,
                )
              ) {
                deleteCategory.mutate({ id: category.id });
              }
            }}
            disabled={deleteCategory.isPending}
            className="rounded-full bg-red-600/80 px-4 py-1.5 text-sm font-semibold transition hover:bg-red-600 disabled:opacity-50"
          >
            {deleteCategory.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

