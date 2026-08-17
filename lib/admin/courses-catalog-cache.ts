const CATALOG_TTL_MS = 10 * 60 * 1000;

type CatalogEntry = { at: number; value: import("@/types/learnworlds").LearnWorldsCourse[] };

type GlobalCatalogCache = {
  courses: CatalogEntry | null;
};

function store(): GlobalCatalogCache {
  const g = globalThis as typeof globalThis & {
    __koPredictCoursesCatalogCache?: GlobalCatalogCache;
  };
  if (!g.__koPredictCoursesCatalogCache) {
    g.__koPredictCoursesCatalogCache = { courses: null };
  }
  return g.__koPredictCoursesCatalogCache;
}

export function getCachedCoursesCatalog():
  | import("@/types/learnworlds").LearnWorldsCourse[]
  | null {
  const hit = store().courses;
  if (!hit) return null;
  if (Date.now() - hit.at > CATALOG_TTL_MS) {
    store().courses = null;
    return null;
  }
  return hit.value;
}

export function setCachedCoursesCatalog(
  courses: import("@/types/learnworlds").LearnWorldsCourse[],
) {
  store().courses = { at: Date.now(), value: courses };
}

export function invalidateCoursesCatalogCache() {
  store().courses = null;
}
