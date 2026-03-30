import * as fs from "fs";

const utilsPath = "frontend/src/utils/categoryUtils.ts";
let utilsCode = fs.readFileSync(utilsPath, "utf8");

if (!utilsCode.includes("import type { Category")) {
  utilsCode =
    `import type { Category, CategoryDraft } from "@/components/task-list/EditTaskModal";\nimport type React from "react";\n\n` +
    utilsCode;
}

if (!utilsCode.includes("export async function resolveCategoryId")) {
  utilsCode += `
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

  const res = await fetch(\`\${apiBase}/categories\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      color: normalizeHexColor(categoryDraft.newCategoryColor),
    }),
  });
  if (!res.ok) throw new Error(\`status \${res.status}\`);

  const created: Category = await res.json();
  setCategories((prev) =>
    prev.some((c) => c.id === created.id) ? prev : [...prev, created],
  );

  return created.id;
}
`;
  fs.writeFileSync(utilsPath, utilsCode);
}

const files = [
  "frontend/src/components/task-list/TaskListPage.tsx",
  "frontend/src/components/time-blocking/TimeBlockingPage.tsx",
];

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");

  // Replace the function definition
  const regex =
    /  async function resolveCategoryId\([\s\S]*?    return created\.id;\n  }\n/g;
  content = content.replace(regex, "");

  // Replace function calls
  content = content.replace(
    /await resolveCategoryId\(categoryDraft\)/g,
    "await resolveCategoryId(categoryDraft, categories, setCategories, API_BASE)",
  );

  // Update imports
  content = content.replace(
    /import { normalizeHexColor } from "(.*?)utils\/categoryUtils";/,
    `import { normalizeHexColor, resolveCategoryId } from "$1utils/categoryUtils";`,
  );

  fs.writeFileSync(file, content);
});
