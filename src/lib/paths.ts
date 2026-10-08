// Remote paths are always relative to the server folder chosen by the owner.
// The agent re-validates everything (and checks symlinks); this is the same
// rule set so the UI never even sends something the agent would reject.

export const PROTECTED_FILES = ["start.bat", "start.sh"];

export function normalizeRemotePath(input: string): string {
  if (typeof input !== "string") throw new Error("Ruta inválida");
  if (input.length > 512) throw new Error("Ruta demasiado larga");
  if (input.includes("\0")) throw new Error("Ruta inválida");
  if (input.includes(":")) throw new Error("Ruta inválida");
  const unified = input.replace(/\\/g, "/");
  if (unified.startsWith("/") || unified.startsWith("~")) throw new Error("Ruta inválida");
  const parts: string[] = [];
  for (const seg of unified.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (/^\.+$/.test(seg)) throw new Error("Ruta inválida");
    if (/[. ]$/.test(seg)) throw new Error("Ruta inválida");
    if (/[<>"|?*\x00-\x1f]/.test(seg)) throw new Error("Ruta inválida");
    parts.push(seg);
  }
  return parts.join("/");
}

export function joinRemote(base: string, name: string): string {
  return normalizeRemotePath(base ? `${base}/${name}` : name);
}

export function parentRemote(p: string): string {
  const parts = normalizeRemotePath(p).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

export function isProtectedFile(p: string): boolean {
  return PROTECTED_FILES.includes(normalizeRemotePath(p));
}
