const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 32;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePlanningSessionSlug(input: string): string | null {
  let slug = input.trim().toLowerCase();
  slug = slug.replace(/[\s_]+/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");

  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return null;
  }

  if (!SLUG_PATTERN.test(slug)) {
    return null;
  }

  return slug;
}
