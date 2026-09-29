export function normalizeCategoryName(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

export function createCategorySlug(value?: string | null): string {
  const normalized = normalizeCategoryName(value) ?? "uncategorized";

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function toCategoryInput(
  value?: string | null,
  parentValue?: string | null
): { name: string; slug: string; parentName?: string | null } | null {
  const categoryName = normalizeCategoryName(value);

  if (!categoryName) {
    return null;
  }

  const parentName = normalizeCategoryName(parentValue);

  return {
    name: categoryName,
    slug: createCategorySlug(categoryName),
    ...(parentName ? { parentName } : {}),
  };
}
