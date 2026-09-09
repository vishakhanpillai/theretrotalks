export const slugify = (text: string): string => {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const getReviewSlug = (review: { title?: string; slug?: string; id?: string | number }): string => {
  if (review.slug) return review.slug;
  if (review.title) {
    const s = slugify(review.title);
    if (s) return s;
  }
  return String(review.id || "");
};
