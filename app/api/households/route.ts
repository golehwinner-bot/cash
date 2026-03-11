import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

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

export async function GET() {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const memberships = await prisma.householdMember.findMany({
      where: { userId: resolved.userId },
      include: { household: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      households: memberships.map((m) => ({ id: m.household.id, name: m.household.name, role: m.role })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to load households.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const resolved = await resolveCurrentUserId();
    if ("error" in resolved) return resolved.error;

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Household name is required." }, { status: 400 });
    }

    const household = await prisma.household.create({ data: { name } });

    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: resolved.userId,
        role: "OWNER",
      },
    });

    return NextResponse.json({ id: household.id, name: household.name, role: "OWNER" }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to create household.",
      },
      { status: 500 },
    );
  }
}
