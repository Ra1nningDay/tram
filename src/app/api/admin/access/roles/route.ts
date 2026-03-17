import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";
import { ADMIN_ROLE_KEY, EDITOR_ROLE_KEY, ensureSystemRoles, userCanAccessAdmin } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MANAGEABLE_ROLE_KEYS = new Set([ADMIN_ROLE_KEY, EDITOR_ROLE_KEY]);

type UpdateRolePayload = {
  userId?: unknown;
  roleKey?: unknown;
  enabled?: unknown;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
      query: {
        disableRefresh: true,
      },
    });

    if (!session) {
      return jsonError("Authentication required", 401);
    }

    const canAccessAdmin = await userCanAccessAdmin(session.user.id);
    if (!canAccessAdmin) {
      return jsonError("Admin role required", 403);
    }

    const body = (await request.json()) as UpdateRolePayload;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const roleKey = typeof body.roleKey === "string" ? body.roleKey.trim() : "";
    const enabled = body.enabled;

    if (!userId) {
      return jsonError("Invalid userId", 400);
    }

    if (!MANAGEABLE_ROLE_KEYS.has(roleKey)) {
      return jsonError("Invalid roleKey", 400);
    }

    if (typeof enabled !== "boolean") {
      return jsonError("Invalid enabled value", 400);
    }

    const prisma = getPrisma();
    await ensureSystemRoles();

    const [targetUser, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userRoles: {
            select: {
              roleId: true,
              role: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      }),
      prisma.role.findUnique({
        where: { key: roleKey },
        select: {
          id: true,
          key: true,
        },
      }),
    ]);

    if (!targetUser) {
      return jsonError("User not found", 404);
    }

    if (!role) {
      return jsonError("Role not found", 404);
    }

    const hasRole = targetUser.userRoles.some((userRole) => userRole.role.key === roleKey);

    if (enabled && !hasRole) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    }

    if (!enabled && hasRole) {
      if (roleKey === ADMIN_ROLE_KEY) {
        if (session.user.id === userId) {
          return jsonError("You cannot remove your own admin access.", 400);
        }

        const adminCount = await prisma.userRole.count({
          where: {
            role: {
              key: ADMIN_ROLE_KEY,
            },
          },
        });

        if (adminCount <= 1) {
          return jsonError("At least one admin must remain.", 400);
        }
      }

      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id,
          },
        },
      });
    }

    const [updatedUser, memberCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userRoles: {
            select: {
              role: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      }),
      prisma.userRole.count({
        where: {
          role: {
            key: roleKey,
          },
        },
      }),
    ]);

    if (!updatedUser) {
      return jsonError("User not found after update", 404);
    }

    const roleKeys = [...new Set(updatedUser.userRoles.map((userRole) => userRole.role.key))].sort();
    const hasAdminAccess = roleKeys.includes(ADMIN_ROLE_KEY);
    const hasEditorAccess = hasAdminAccess || roleKeys.includes(EDITOR_ROLE_KEY);

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        roleKeys,
        hasAdminAccess,
        hasEditorAccess,
      },
      role: {
        key: roleKey,
        memberCount,
      },
    });
  } catch (error) {
    console.error("Failed to update admin access role", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown role update error",
      },
      { status: 500 }
    );
  }
}
