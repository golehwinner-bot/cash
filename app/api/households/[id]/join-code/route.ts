import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type JoinRole = "ADMIN" | "MEMBER";

const randomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

export async function GET(_request: Request, context: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: householdId } = await context.params;

    const membership = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: session.user.id, householdId } },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { joinCode: true, joinRole: true, joinCodeExpiresAt: true },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found." }, { status: 404 });
    }

    const isActive =
      !!household.joinCode && !!household.joinCodeExpiresAt && household.joinCodeExpiresAt.getTime() > Date.now();

    if (!isActive) {
      return NextResponse.json({ code: null, role: null, expiresAt: null });
    }

    return NextResponse.json({
      code: household.joinCode,
      role: household.joinRole,
      expiresAt: household.joinCodeExpiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? toErrorMessage(error) : "Failed to load join code." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: householdId } = await context.params;

    const membership = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: session.user.id, householdId } },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const role = String(body.role ?? "MEMBER").toUpperCase() as JoinRole;
    const joinRole: JoinRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

    let updated: { joinCode: string | null; joinRole: string | null; joinCodeExpiresAt: Date | null } | null = null;

    for (let attempt = 0; attempt < 15; attempt += 1) {
      const code = randomCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      try {
        updated = await prisma.household.update({
          where: { id: householdId },
          data: {
            joinCode: code,
            joinRole,
            joinCodeExpiresAt: expiresAt,
          },
          select: { joinCode: true, joinRole: true, joinCodeExpiresAt: true },
        });
        break;
      } catch (error) {
        const message = toErrorMessage(error);
        if (message.includes("Unique constraint") || message.includes("P2002")) {
          continue;
        }
        throw error;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: "Could not generate a unique code. Try again." }, { status: 500 });
    }

    return NextResponse.json({
      code: updated.joinCode,
      role: updated.joinRole,
      expiresAt: updated.joinCodeExpiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to generate join code.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: householdId } = await context.params;

    const membership = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: session.user.id, householdId } },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.household.update({
      where: { id: householdId },
      data: {
        joinCode: null,
        joinRole: null,
        joinCodeExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? toErrorMessage(error) : "Failed to clear join code." },
      { status: 500 },
    );
  }
}
