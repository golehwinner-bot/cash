import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const resolveCurrentUserId = async () => {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.id) {
    const byId = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (byId) return { userId: byId.id };
  }

  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (byEmail) return { userId: byEmail.id };
  }

  return {
    error: NextResponse.json(
      { error: "Session is out of sync. Please sign in again." },
      { status: 401 },
    ),
  };
};

const isValidScopeKey = (value: string) => value === "personal" || value.startsWith("room:");

const ensureDefaultScopeColumn = async () => {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultScopeKey" TEXT NOT NULL DEFAULT 'personal'`,
  );
};

export async function GET() {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    await ensureDefaultScopeColumn();

    const rows = await prisma.$queryRaw<Array<{ defaultScopeKey: string }>>`
      SELECT "defaultScopeKey"
      FROM "User"
      WHERE id = ${resolved.userId}
      LIMIT 1
    `;

    return NextResponse.json({
      defaultScopeKey: rows[0]?.defaultScopeKey || "personal",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load user settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const body = await request.json().catch(() => ({}));
    const rawScopeKey = String(body.defaultScopeKey ?? "personal").trim();
    const defaultScopeKey = rawScopeKey || "personal";

    if (!isValidScopeKey(defaultScopeKey)) {
      return NextResponse.json({ error: "Invalid scope key." }, { status: 400 });
    }

    if (defaultScopeKey.startsWith("room:")) {
      const householdId = defaultScopeKey.slice(5);
      if (!householdId) {
        return NextResponse.json({ error: "Invalid scope key." }, { status: 400 });
      }

      const membership = await prisma.householdMember.findUnique({
        where: { userId_householdId: { userId: resolved.userId, householdId } },
        select: { householdId: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Access denied for this room." }, { status: 403 });
      }
    }

    await ensureDefaultScopeColumn();

    await prisma.$executeRaw`
      UPDATE "User"
      SET "defaultScopeKey" = ${defaultScopeKey}
      WHERE id = ${resolved.userId}
    `;

    return NextResponse.json({ ok: true, defaultScopeKey });
  } catch {
    return NextResponse.json({ error: "Failed to update user settings." }, { status: 500 });
  }
}

