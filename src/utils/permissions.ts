export type PermissionAction =
  | "view"
  | "add"
  | "create"
  | "edit"
  | "delete"
  | "print";

export interface User {
  id?: number | string;
  role?: string | { name?: string };
  is_admin?: boolean | number;
  is_admin_branch?: boolean | number;
  permissions?: Record<string, Record<string, boolean>>;
}

const ADMIN_ROLES = new Set(["admin", "superadmin", "owner"]);

export const normalizeRole = (role?: string | { name?: string } | null) => {
  if (!role) return "";
  return typeof role === "string" ? role.toLowerCase() : role.name?.toLowerCase?.() || "";
};

const getStoredPermissions = (userId?: number | string) => {
  if (!userId) return null;

  try {
    const stored = localStorage.getItem("user_permissions");
    if (!stored) return null;

    const allPermissions = JSON.parse(stored) as Record<
      string,
      Record<string, Record<string, boolean>>
    >;

    return allPermissions[String(userId)] || null;
  } catch {
    return null;
  }
};

export function hasPermission(
  user: User | null,
  section: string,
  action: PermissionAction = "view"
): boolean {
  if (!user) return false;

  const role = normalizeRole(user.role);

  if (
    ADMIN_ROLES.has(role) ||
    user.is_admin === true ||
    user.is_admin === 1 ||
    user.is_admin_branch === true ||
    user.is_admin_branch === 1
  ) {
    return true;
  }

  const permissions = user.permissions || getStoredPermissions(user.id);
  const aliases =
    action === "add"
      ? ["add", "create"]
      : action === "create"
        ? ["create", "add"]
        : [action];

  return aliases.some((key) => Boolean(permissions?.[section]?.[key]));
}
