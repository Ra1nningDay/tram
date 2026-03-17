import { getPrisma } from "@/lib/prisma";

export const EDITOR_ROLE_KEY = "editor";
export const ADMIN_ROLE_KEY = "admin";
export const EDITOR_ACCESS_ROLE_KEYS = [ADMIN_ROLE_KEY, EDITOR_ROLE_KEY] as const;
export const SYSTEM_ROLES = [
  {
    key: ADMIN_ROLE_KEY,
    name: "Admin",
    description: "Full dashboard access",
  },
  {
    key: EDITOR_ROLE_KEY,
    name: "Editor",
    description: "Map editor access",
  },
] as const;

type UserRoleKeyRecord = {
  role: {
    key: string;
  };
};

export async function getUserRoleKeys(userId: string): Promise<string[]> {
  const userRoles: UserRoleKeyRecord[] = await getPrisma().userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          key: true,
        },
      },
    },
  });

  return userRoles.map((userRole: UserRoleKeyRecord) => userRole.role.key);
}

export async function userHasRole(userId: string, roleKey: string): Promise<boolean> {
  const userRole = await getPrisma().userRole.findFirst({
    where: {
      userId,
      role: {
        key: roleKey,
      },
    },
    select: {
      userId: true,
    },
  });

  return Boolean(userRole);
}

export async function userHasAnyRole(userId: string, roleKeys: readonly string[]): Promise<boolean> {
  const userRole = await getPrisma().userRole.findFirst({
    where: {
      userId,
      role: {
        key: {
          in: [...roleKeys],
        },
      },
    },
    select: {
      userId: true,
    },
  });

  return Boolean(userRole);
}

export async function userCanAccessEditor(userId: string): Promise<boolean> {
  return userHasAnyRole(userId, EDITOR_ACCESS_ROLE_KEYS);
}

export async function userCanAccessAdmin(userId: string): Promise<boolean> {
  return userHasRole(userId, ADMIN_ROLE_KEY);
}

export async function ensureSystemRoles() {
  const prisma = getPrisma();

  return Promise.all(
    SYSTEM_ROLES.map((role) =>
      prisma.role.upsert({
        where: {
          key: role.key,
        },
        update: {
          name: role.name,
          description: role.description,
        },
        create: {
          key: role.key,
          name: role.name,
          description: role.description,
        },
      })
    )
  );
}
