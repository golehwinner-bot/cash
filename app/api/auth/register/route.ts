import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);

    const message = error instanceof Error ? error.message : "Failed to register.";
    const exposedMessage = process.env.NODE_ENV === "development" ? message : "Failed to register.";

    return NextResponse.json({ error: exposedMessage }, { status: 500 });
  }
}
