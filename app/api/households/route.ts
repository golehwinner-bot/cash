import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.householdMember.findMany({
    where: { userId: session.user.id },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ households: memberships.map((m) => ({ id: m.household.id, name: m.household.name, role: m.role })) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Household name is required." }, { status: 400 });
  }

  const household = await prisma.household.create({ data: { name } });

  await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: session.user.id,
      role: "OWNER",
    },
  });

  return NextResponse.json({ id: household.id, name: household.name, role: "OWNER" }, { status: 201 });
}
