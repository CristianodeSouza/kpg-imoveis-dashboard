export const tenantRoles = ["owner", "admin", "operator", "viewer"] as const;
export type TenantRole = (typeof tenantRoles)[number];

const permissions: Record<TenantRole, string[]> = {
  owner: ["*"],
  admin: ["settings:write", "content:write", "leads:write", "billing:read", "users:manage"],
  operator: ["content:write", "leads:write", "settings:read"],
  viewer: ["content:read", "leads:read", "settings:read", "billing:read"]
};

export function normalizeRole(role?: string | null): TenantRole {
  return tenantRoles.includes(role as TenantRole) ? (role as TenantRole) : "viewer";
}

export function roleCan(role: string | null | undefined, permission: string) {
  const grants = permissions[normalizeRole(role)];
  return grants.includes("*") || grants.includes(permission);
}
