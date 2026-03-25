const DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ț: "t",
  Ă: "a", Â: "a", Î: "i", Ș: "s", Ț: "t",
  // Common alternate cedilla codepoints
  ş: "s", ţ: "t", Ş: "s", Ţ: "t",
};

const DIACRITICS_RE = new RegExp(`[${Object.keys(DIACRITICS).join("")}]`, "g");

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(DIACRITICS_RE, (ch) => DIACRITICS[ch] ?? ch)
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateWeddingSlug(name1: string, name2: string, date: string): string {
  const year = /^\d{4}/.exec(date)?.[0] ?? "";
  return slugify(`${name1}-si-${name2}-${year}`);
}
