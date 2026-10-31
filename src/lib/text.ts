// Dependency-free text helpers (also used by the agent worker).

// Lowercase and strip Vietnamese diacritics so "cuộc họp" matches "cuoc hop".
export function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}
