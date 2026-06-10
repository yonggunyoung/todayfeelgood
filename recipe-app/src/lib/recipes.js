// 표준 레시피 스키마 — 모든 소스(유튜브/블로그/텍스트)가 이 형태로 정규화된다.
// {
//   id, title, sourceType: 'youtube'|'web'|'text',
//   sourceUrl, videoId, thumbnail,
//   servings, totalTimeMinutes, tags: [],
//   ingredients: [{ name, amount }],
//   steps: [{ text, timestampSeconds|null }],
//   memo, createdAt
// }

const STORAGE_KEY = 'recipebook-v1';

export function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function createRecipe(partial) {
  return {
    id: crypto.randomUUID(),
    title: '',
    sourceType: 'text',
    sourceUrl: '',
    videoId: '',
    thumbnail: '',
    servings: '',
    totalTimeMinutes: null,
    tags: [],
    ingredients: [],
    steps: [],
    memo: '',
    createdAt: Date.now(),
    ...partial,
  };
}

export function searchRecipes(recipes, query, tag) {
  const q = query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  });
}

export function allTags(recipes) {
  return [...new Set(recipes.flatMap((r) => r.tags))];
}
