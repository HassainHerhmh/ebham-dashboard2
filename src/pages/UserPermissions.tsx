import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  getRoleLabel,
  permissionActions,
  permissionGroups,
  permissionSections,
  roleOptions,
} from "../config/permissions";
import type { PermissionSection } from "../config/permissions";
import type { PermissionAction } from "../utils/permissions";
import { normalizeRole } from "../utils/permissions";

type PermissionMap = Record<string, Record<PermissionAction, boolean>>;

interface UserRow {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string | { name?: string };
  permissions?: PermissionMap | string | null;
}

const createEmptyPermissions = (): PermissionMap =>
  permissionSections.reduce((acc, section) => {
    acc[section.key] = permissionActions.reduce((actions, action) => {
      actions[action.key] = false;
      return actions;
    }, {} as Record<PermissionAction, boolean>);
    return acc;
  }, {} as PermissionMap);

const normalizePermissions = (value?: PermissionMap | string | null): PermissionMap => {
  const empty = createEmptyPermissions();

  if (!value) return empty;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    permissionSections.forEach((section) => {
      permissionActions.forEach((action) => {
        const serverKey = action.key === "add" ? "create" : action.key;
        empty[section.key][action.key] = Boolean(
          parsed?.[section.key]?.[action.key] || parsed?.[section.key]?.[serverKey]
        );
      });
    });
  } catch {
    return empty;
  }

  return empty;
};

const toServerPermissions = (value: PermissionMap) =>
  permissionSections.reduce((acc, section) => {
    acc[section.key] = permissionActions.reduce((actions, action) => {
      const serverKey = action.key === "add" ? "create" : action.key;
      actions[serverKey] = Boolean(value[section.key]?.[action.key]);
      return actions;
    }, {} as Record<string, boolean>);

    return acc;
  }, {} as Record<string, Record<string, boolean>>);

const getSectionKeys = (sections: PermissionSection[]) => [
  ...new Set(sections.map((section) => section.key)),
];

const getStoredPermissions = (userId: number) => {
  try {
    const stored = JSON.parse(localStorage.getItem("user_permissions") || "{}");
    return stored[String(userId)] as PermissionMap | undefined;
  } catch {
    return undefined;
  }
};

const saveStoredPermissions = (userId: number, permissions: PermissionMap) => {
  const stored = JSON.parse(localStorage.getItem("user_permissions") || "{}");
  stored[String(userId)] = permissions;
  localStorage.setItem("user_permissions", JSON.stringify(stored));
};

const updateCurrentUserPermissions = (
  userId: number,
  role: string,
  permissions: PermissionMap
) => {
  try {
    const current = JSON.parse(localStorage.getItem("user") || "null");
    if (!current || Number(current.id) !== Number(userId)) return;

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...current,
        role,
        permissions,
      })
    );
  } catch {
    // Ignore invalid local storage data.
  }
};

const UserPermissions: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [role, setRole] = useState("employee");
  const [permissions, setPermissions] = useState<PermissionMap>(() =>
    createEmptyPermissions()
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((user) => normalizeRole(user.role) === roleFilter);
  }, [roleFilter, users]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await (api as any).users.getUsers();
        const list = res.users || res.data?.users || [];
        setUsers(list);

        if (list.length) {
          const firstUser = list[0];
          setSelectedUserId(firstUser.id);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }

    const selectedIsVisible = filteredUsers.some(
      (user) => user.id === selectedUserId
    );

    if (!selectedIsVisible) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    if (!selectedUser) return;

    const userRole = normalizeRole(selectedUser.role) || "employee";
    setRole(userRole);

    const fetchPermissions = async () => {
      const localPermissions = getStoredPermissions(selectedUser.id);
      let nextPermissions = normalizePermissions(
        localPermissions || selectedUser.permissions
      );

      try {
        const response = await (api as any).users.getPermissions(selectedUser.id);
        nextPermissions = normalizePermissions(
          response.permissions || response.data?.permissions || nextPermissions
        );
      } catch {
        // The permissions endpoint may not exist yet. Local storage keeps the UI usable.
      }

      setPermissions(nextPermissions);
    };

    fetchPermissions();
  }, [selectedUser]);

  const togglePermission = (sectionKey: string, action: PermissionAction) => {
    setPermissions((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [action]: !current[sectionKey]?.[action],
      },
    }));
  };

  const setSectionPermissions = (sectionKey: string, value: boolean) => {
    setPermissions((current) => ({
      ...current,
      [sectionKey]: permissionActions.reduce((actions, action) => {
        actions[action.key] = value;
        return actions;
      }, {} as Record<PermissionAction, boolean>),
    }));
  };

  const setSectionsPermissions = (
    sections: PermissionSection[],
    action: PermissionAction,
    value: boolean
  ) => {
    const sectionKeys = getSectionKeys(sections);

    setPermissions((current) => {
      const next = { ...current };

      sectionKeys.forEach((sectionKey) => {
        next[sectionKey] = {
          ...next[sectionKey],
          [action]: value,
        };
      });

      return next;
    });
  };

  const setGroupPermissions = (sections: PermissionSection[], value: boolean) => {
    const sectionKeys = getSectionKeys(sections);

    setPermissions((current) => {
      const next = { ...current };

      sectionKeys.forEach((sectionKey) => {
        next[sectionKey] = permissionActions.reduce((actions, action) => {
          actions[action.key] = value;
          return actions;
        }, {} as Record<PermissionAction, boolean>);
      });

      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  };

  const areSectionsActionSelected = (
    sections: PermissionSection[],
    action: PermissionAction
  ) =>
    getSectionKeys(sections).every((sectionKey) =>
      Boolean(permissions[sectionKey]?.[action])
    );

  const areSectionsFullySelected = (sections: PermissionSection[]) =>
    getSectionKeys(sections).every((sectionKey) =>
      permissionActions.every((action) => Boolean(permissions[sectionKey]?.[action.key]))
    );

  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await (api as any).users.updatePermissions(selectedUser.id, {
        role,
        permissions: toServerPermissions(permissions),
      });

      saveStoredPermissions(selectedUser.id, permissions);
      updateCurrentUserPermissions(selectedUser.id, role, permissions);
      setUsers((current) =>
        current.map((user) =>
          user.id === selectedUser.id
            ? { ...user, role, permissions }
            : user
        )
      );
      alert("تم حفظ الصلاحيات");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "فشل حفظ الصلاحيات. تأكد من مسار السيرفر وصلاحية المستخدم الحالي.";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">جاري تحميل المستخدمين...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">صلاحيات المستخدمين</h1>
        <p className="mt-1 text-sm text-gray-600">
          اختر المستخدم، حدد نوعه، ثم فعّل الصفحات والعمليات المناسبة له.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">
              فلترة حسب النوع
            </span>
            <select
              className="border rounded-md p-2 w-full"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">كل المستخدمين</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">المستخدم</span>
            <select
              className="border rounded-md p-2 w-full"
              value={selectedUserId}
              onChange={(event) =>
                setSelectedUserId(event.target.value ? Number(event.target.value) : "")
              }
            >
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {getRoleLabel(normalizeRole(user.role))}
                </option>
              ))}
            </select>
          </label>

        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3">الصفحة</th>
                {permissionActions.map((action) => (
                  <th key={action.key} className="p-3 text-center">
                    {action.label}
                  </th>
                ))}
                <th className="p-3 text-center">الكل</th>
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group) => {
                const groupSections = group.children.length
                  ? group.children
                  : group.section
                    ? [group.section]
                    : [];
                const isExpanded = Boolean(expandedGroups[group.key]);

                return (
                  <React.Fragment key={group.key}>
                    <tr className="border-t bg-gray-50">
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex items-center gap-2 text-right font-bold text-gray-900"
                        >
                          <span className="inline-block w-4">
                            {isExpanded ? "⌄" : "‹"}
                          </span>
                          <span>{group.label}</span>
                        </button>
                        <div className="text-xs text-gray-500">
                          تحديد القسم كامل
                        </div>
                      </td>
                      {permissionActions.map((action) => (
                        <td key={action.key} className="p-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={areSectionsActionSelected(groupSections, action.key)}
                            onChange={(event) =>
                              setSectionsPermissions(
                                groupSections,
                                action.key,
                                event.target.checked
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={areSectionsFullySelected(groupSections)}
                          onChange={(event) =>
                            setGroupPermissions(groupSections, event.target.checked)
                          }
                        />
                      </td>
                    </tr>

                    {isExpanded && group.children.map((section) => {
                      const sectionPermissions = permissions[section.key] || {};
                      const isAllSelected = permissionActions.every(
                        (action) => sectionPermissions[action.key]
                      );

                      return (
                        <tr key={`${group.key}-${section.key}`} className="border-t">
                          <td className="p-3">
                            <div className="font-semibold text-gray-900 pr-4">
                              {section.label}
                            </div>
                            {section.path && (
                              <div className="text-xs text-gray-500 pr-4">
                                {section.path}
                              </div>
                            )}
                          </td>
                          {permissionActions.map((action) => (
                            <td key={action.key} className="p-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={Boolean(sectionPermissions[action.key])}
                                onChange={() =>
                                  togglePermission(section.key, action.key)
                                }
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={isAllSelected}
                              onChange={(event) =>
                                setSectionPermissions(
                                  section.key,
                                  event.target.checked
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!selectedUser || saving}
          className="bg-green-600 text-white px-5 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
        </button>
      </div>
    </div>
  );
};

export default UserPermissions;
