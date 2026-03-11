import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: householdId } = await context.params;

  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: session.user.id, householdId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((item) => ({
      id: item.id,
      role: item.role,
      userId: item.user.id,
      name: item.user.name,
      email: item.user.email,
    })),
  });
}

export async function POST(request: Request, context: Params) {
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

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = (String(body.role ?? "MEMBER").toUpperCase() as "ADMIN" | "MEMBER");

  if (!email) {
    return NextResponse.json({ error: "Member email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const member = await prisma.householdMember.upsert({
    where: { userId_householdId: { userId: user.id, householdId } },
    update: { role },
    create: {
      userId: user.id,
      householdId,
      role,
    },
  });

  return NextResponse.json({ id: member.id, userId: member.userId, role: member.role });
}
