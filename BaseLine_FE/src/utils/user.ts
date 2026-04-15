export function makeUsernameFromName(name?: string | null) {
  const base = (name ?? "user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".");

  return base.length
    ? `${base}.${Math.floor(1000 + Math.random() * 9000)}`
    : `user.${Date.now()}`;
}
