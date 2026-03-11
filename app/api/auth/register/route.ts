import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const householdName = String(body.householdName ?? "").trim();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name || null,
          email,
          passwordHash,
        },
      });

      const household = await tx.household.create({
        data: {
          name: householdName || `Family of ${name || email}`,
        },
      });

      await tx.householdMember.create({
        data: {
          role: "OWNER",
          userId: user.id,
          householdId: household.id,
        },
      });

      return { user, household };
    });

    return NextResponse.json({
      userId: result.user.id,
      householdId: result.household.id,
    });
  } catch (error) {
    console.error("Register error:", error);

    const message = error instanceof Error ? error.message : "Failed to register.";
    const exposedMessage = process.env.NODE_ENV === "development" ? message : "Failed to register.";

    return NextResponse.json({ error: exposedMessage }, { status: 500 });
  }
}
