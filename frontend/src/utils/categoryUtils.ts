import type {
  Category,
  CategoryDraft,
} from "@/components/task-list/EditTaskModal";
import type React from "react";

export function normalizeHexColor(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "#6366f1";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const hex = withHash
    .slice(1)
    .replace(/[^0-9a-fA-F]/g, "")
    .toLowerCase();
  if (hex.length === 3 || hex.length === 6) return `#${hex}`;
  if (hex.length > 6) return `#${hex.slice(0, 6)}`;
  return "#6366f1";
}

export async function resolveCategoryId(
  categoryDraft: CategoryDraft,
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  apiBase: string,
): Promise<number | null> {
  if (categoryDraft.mode === "existing") {
    return categoryDraft.categoryId;
  }

  const name = categoryDraft.newCategoryName.trim();
  if (!name) {
    return null;
  }

  const existing = categories.find((c) => c.name === name);
  if (existing) {
    return existing.id;
  }

  const res = await fetch(`${apiBase}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      color: normalizeHexColor(categoryDraft.newCategoryColor),
    }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);

  const created: Category = await res.json();
  setCategories((prev) =>
    prev.some((c) => c.id === created.id) ? prev : [...prev, created],
  );

  return created.id;
}
