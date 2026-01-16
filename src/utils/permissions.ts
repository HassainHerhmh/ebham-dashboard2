// ===============================
// 🔐 Types
// ===============================

export type PermissionAction =
  | "view"
  | "add"
  | "edit"
  | "delete"
  | "print";

export interface User {
  role?: string | { name?: string };
  permissions?: Record<string, Record<string, boolean>>;
}

// ===============================
// 🔐 Permission Checker (مؤقت)
// ===============================

export function hasPermission(
  user: User | null,
  _section: string,
  _action: PermissionAction = "view"
): boolean {
  if (!user) return false;

  const role =
    typeof user.role === "string"
      ? user.role.toLowerCase()
      : user.role?.name?.toLowerCase?.();

  // 🟢 مؤقتًا: الأدمن له كل الصلاحيات
  if (role === "admin") {
    return true;
  }

  // لاحقًا سنعتمد على user.permissions
  return false;
}
