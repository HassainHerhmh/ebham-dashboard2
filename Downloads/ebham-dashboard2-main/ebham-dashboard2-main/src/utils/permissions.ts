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

  // اعتبر كل الأدوار الإدارية لها صلاحية
  if (role === "admin" || role === "superadmin" || role === "owner") {
    return true;
  }

  // مؤقتًا: اسمح لباقي المستخدمين بكل شيء حتى نربط permissions لاحقًا
  return true;
}
