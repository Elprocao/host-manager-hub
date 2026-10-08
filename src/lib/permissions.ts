// Mirror of the SQL function public.can_issue — used only to show/hide UI.
// The database policy is the real gate.
export type ServerRole = "owner" | "admin" | "editor" | "viewer";
export type CommandType =
  | "list"
  | "read"
  | "write"
  | "mkdir"
  | "delete"
  | "rename"
  | "setup"
  | "start"
  | "stop"
  | "console";

const READ: CommandType[] = ["list", "read"];
const FILES: CommandType[] = [...READ, "write", "mkdir", "delete", "rename"];
const ALL: CommandType[] = [...FILES, "setup", "start", "stop", "console"];

export const ROLE_COMMANDS: Record<ServerRole, CommandType[]> = {
  owner: ALL,
  admin: ALL,
  editor: FILES,
  viewer: READ,
};

export function canIssue(role: ServerRole | null | undefined, type: CommandType): boolean {
  if (!role) return false;
  return ROLE_COMMANDS[role].includes(type);
}

export const ROLE_LABEL: Record<ServerRole, string> = {
  owner: "Dueño",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
};
