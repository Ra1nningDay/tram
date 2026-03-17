import { Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";
import {
  ADMIN_ROLE_KEY,
  EDITOR_ROLE_KEY,
  ensureSystemRoles,
  userCanAccessAdmin,
} from "@/lib/auth/roles";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreateUserPayload = {
  name?: unknown;
  email?: unknown;
  username?: unknown;
  password?: unknown;
  roleKeys?: unknown;
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

    const body = (await request.json()) as CreateUserPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedRoleKeys = Array.isArray(body.roleKeys)
      ? body.roleKeys.filter((roleKey): roleKey is string => typeof roleKey === "string")
      : [];

    if (!name) {
      return jsonError("Name is required", 400);
    }

    if (!email || !email.includes("@")) {
      return jsonError("Valid email is required", 400);
    }

    if (!username || username.length < 3) {
      return jsonError("Username must be at least 3 characters", 400);
    }

    if (!password || password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    await ensureSystemRoles();

    const prisma = getPrisma();
    const passwordHash = await hashPassword(password);
    const uniqueRoleKeys = [...new Set(requestedRoleKeys)].sort();

    const roles = uniqueRoleKeys.length
      ? await prisma.role.findMany({
          where: {
            key: {
              in: uniqueRoleKeys,
            },
          },
          select: {
            id: true,
            key: true,
          },
        })
      : [];

    if (roles.length !== uniqueRoleKeys.length) {
      return jsonError("One or more roles are invalid", 400);
    }

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          username,
          displayUsername: username,
          emailVerified: true,
        },
      });

      await tx.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: user.id,
            roleId: role.id,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          emailVerified: true,
          createdAt: true,
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
      });
    });

    if (!createdUser) {
      return jsonError("Failed to create user", 500);
    }

    const roleKeys = [...new Set(createdUser.userRoles.map((userRole) => userRole.role.key))].sort();
    const hasAdminAccess = roleKeys.includes(ADMIN_ROLE_KEY);
    const hasEditorAccess = hasAdminAccess || roleKeys.includes(EDITOR_ROLE_KEY);

    const updatedRoles = roleKeys.length
      ? await prisma.role.findMany({
          where: {
            key: {
              in: roleKeys,
            },
          },
          select: {
            key: true,
            _count: {
              select: {
                userRoles: true,
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      ok: true,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        username: createdUser.username,
        emailVerified: createdUser.emailVerified,
        hasPasswordAccount: true,
        hasAdminAccess,
        hasEditorAccess,
        roleKeys,
        activeSessionCount: 0,
        lastSessionAt: null,
        createdAt: createdUser.createdAt,
      },
      roles: updatedRoles.map((role) => ({
        key: role.key,
        memberCount: role._count.userRoles,
      })),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Email or username already exists", 409);
    }

    console.error("Failed to create admin user", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown create user error",
      },
      { status: 500 }
    );
  }
}
