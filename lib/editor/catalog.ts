import type { DesignCategory, FreeDesignId } from "../shape-library";

type ProjectListItem = {
  projectName: string;
  savedAt: string;
};

export type LibrarySort = "recent" | "name";

export type StarterDesignListItem = {
  id: FreeDesignId;
  name: string;
  description: string;
  category: DesignCategory;
};

export function getVisibleLibraryProjects<Project extends ProjectListItem>(
  projects: Project[],
  query: string,
  sort: LibrarySort,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");
  const filtered = normalizedQuery
    ? projects.filter((project) =>
        project.projectName.toLocaleLowerCase("es-AR").includes(normalizedQuery),
      )
    : projects;
  return [...filtered].sort((a, b) =>
    sort === "name"
      ? a.projectName.localeCompare(b.projectName, "es-AR", { sensitivity: "base" })
      : Date.parse(b.savedAt) - Date.parse(a.savedAt),
  );
}

export function getVisibleStarterDesigns<Design extends StarterDesignListItem>(
  designs: Design[],
  query: string,
  category: "all" | DesignCategory,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");
  return designs.filter((design) =>
    (category === "all" || design.category === category) &&
    (!normalizedQuery ||
      `${design.name} ${design.description}`
        .toLocaleLowerCase("es-AR")
        .includes(normalizedQuery)),
  );
}

export function getSelectedStarterDesign<Design extends StarterDesignListItem>(
  designs: Design[],
  selectedId: FreeDesignId,
) {
  return designs.find((design) => design.id === selectedId) ?? designs[0];
}
