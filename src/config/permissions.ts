import type { PermissionAction } from "../utils/permissions";

export type PermissionSection = {
  key: string;
  label: string;
  path?: string;
};

export type PermissionGroup = {
  key: string;
  label: string;
  section?: PermissionSection;
  children: PermissionSection[];
};

export const roleOptions = [
  { value: "admin", label: "أدمن" },
  { value: "accountant", label: "محاسب" },
  { value: "employee", label: "موظف" },
  { value: "service", label: "موظف خدمة" },
  { value: "marketer", label: "مسوق" },
  { value: "captain", label: "كابتن" },
  { value: "agent", label: "وكيل" },
];

export const permissionActions: Array<{ key: PermissionAction; label: string }> = [
  { key: "view", label: "قراءة" },
  { key: "add", label: "إضافة" },
  { key: "edit", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "print", label: "طباعة" },
];

export const permissionGroups: PermissionGroup[] = [
  {
    key: "main",
    label: "الرئيسية",
    children: [
      { key: "dashboard", label: "لوحة التحكم", path: "/" },
      { key: "users", label: "المستخدمين", path: "/users" },
      { key: "customers", label: "العملاء", path: "/customers" },
    ],
  },
  {
    key: "orders",
    label: "الطلبات",
    section: { key: "orders", label: "كل الطلبات", path: "/orders" },
    children: [
      { key: "orders", label: "كل الطلبات", path: "/orders" },
      { key: "wassel_orders", label: "طلبات وصل لي", path: "/orders/wassel" },
      { key: "manual_orders", label: "طلبات يدوية", path: "/orders/manual" },
    ],
  },
  {
    key: "marketing",
    label: "التسويق",
    section: { key: "marketing", label: "إعلانات وعروض", path: "/marketing" },
    children: [
      { key: "marketing", label: "إعلانات وعروض", path: "/marketing" },
      { key: "loyalty", label: "نقاط الولاء", path: "/loyalty" },
    ],
  },
  {
    key: "reports",
    label: "التقارير",
    section: { key: "reports", label: "تقرير العمليات", path: "/reports" },
    children: [
      { key: "reports", label: "تقرير العمليات", path: "/reports" },
      { key: "commission_reports", label: "تقرير العمولات", path: "/reports/commissions" },
      { key: "agent_reports", label: "تقارير الوكلاء", path: "/reports/agents" },
      { key: "captain_reports", label: "تقارير الكباتن", path: "/reports/captains" },
    ],
  },
  {
    key: "delivery_settings",
    label: "إعدادات التوصيل",
    children: [
      { key: "settings", label: "رسوم التوصيل", path: "/settings/delivery-fees" },
      { key: "neighborhoods", label: "الأحياء", path: "/neighborhoods" },
    ],
  },
  {
    key: "delivery_setup",
    label: "تهيئة المحلات",
    children: [
      { key: "restaurants", label: "المحلات", path: "/restaurants" },
      { key: "products", label: "المنتجات", path: "/products" },
      { key: "categories", label: "الفئات", path: "/categories" },
      { key: "units", label: "الوحدات", path: "/units" },
      { key: "types", label: "الأنواع", path: "/types" },
    ],
  },
  {
    key: "agents_setup",
    label: "تهيئة الوكلاء/الكباتن",
    children: [
      { key: "agents", label: "الوكلاء", path: "/agents" },
      { key: "agent_groups", label: "مجموعة الوكلاء", path: "/agents/groups" },
      { key: "captains", label: "الكباتن", path: "/captains" },
      { key: "Captain_Groups", label: "مجموعة الكباتن", path: "/CaptainGroups" },
      { key: "agent_info", label: "عمولات", path: "/agents/info" },
    ],
  },
  {
    key: "settings",
    label: "الإعدادات",
    children: [
      { key: "payment", label: "الدفع", path: "/settings/payment" },
      { key: "currency", label: "العملات", path: "/settings/currency" },
      { key: "branches", label: "الفروع", path: "/settings/branches" },
    ],
  },
  {
    key: "payments",
    label: "المدفوعات",
    section: { key: "payments", label: "المدفوعات", path: "/payments/electronic" },
    children: [
      { key: "payments", label: "المدفوعات", path: "/payments/electronic" },
    ],
  },
  {
    key: "accounts",
    label: "الحسابات",
    section: { key: "accounts", label: "الحسابات", path: "/accounts" },
    children: [
      { key: "accounts", label: "الحسابات", path: "/accounts" },
    ],
  },
];

export const permissionSections: PermissionSection[] = permissionGroups.reduce(
  (sections, group) => {
    const all = [...(group.section ? [group.section] : []), ...group.children];

    all.forEach((section) => {
      if (!sections.some((item) => item.key === section.key)) {
        sections.push(section);
      }
    });

    return sections;
  },
  [] as PermissionSection[]
);

export const getRoleLabel = (role?: string | null) => {
  const value = role?.toLowerCase();
  return roleOptions.find((item) => item.value === value)?.label || role || "-";
};
