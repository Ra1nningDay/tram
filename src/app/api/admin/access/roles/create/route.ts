import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";
import { userCanAccessAdmin } from "@/lib/auth/roles";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreateRolePayload = {
  key?: unknown;
  name?: unknown;
  description?: unknown;
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

    const body = (await request.json()) as CreateRolePayload;
    const rawKey = typeof body.key === "string" ? body.key.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!rawKey || !/^[a-z0-9_-]{3,32}$/.test(rawKey)) {
      return jsonError("Role key must use a-z, 0-9, - or _ and be 3-32 characters", 400);
    }

    if (!name) {
      return jsonError("Role name is required", 400);
    }

    const role = await getPrisma().role.create({
      data: {
        key: rawKey,
        name,
        description: description || null,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
      },
    });

    return NextResponse.json({
      ok: true,
      role: {
        ...role,
        memberCount: 0,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Role key already exists", 409);
    }

    console.error("Failed to create role", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown create role error",
      },
      { status: 500 }
    );
  }
}
