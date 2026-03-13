import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

type Params = { params: Promise<{ id: string }> };

const notifyRoomMembers = async (params: {
  householdId: string;
  actorUserId: string;
  title: string;
  body: string;
}) => {
  const members = await prisma.householdMember.findMany({
    where: {
      householdId: params.householdId,
      userId: { not: params.actorUserId },
    },
    select: { userId: true },
  });

  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((member) => ({
      userId: member.userId,
      type: "ROOM_DELETED",
      title: params.title,
      body: params.body,
    })),
  });


  await Promise.all(
    members.map((member) =>
      sendPushToUser(member.userId, {
        title: params.title,
        body: params.body,
        url: "/",
      }).catch(() => ({ sent: 0 })),
    ),
  );
};

const cleanupPersonalMirrorsOnRoomLeave = async (householdId: string, targetUserId: string) => {
  const personal = await prisma.household.findUnique({
    where: { personalOwnerId: targetUserId },
    select: { id: true },
  });

  if (!personal) return;

  const [expenseRows, incomeRows, currencyRows] = await prisma.$transaction([
    prisma.expense.findMany({
      where: { householdId, createdById: targetUserId, mirrorKey: { not: null } },
      select: { mirrorKey: true },
    }),
    prisma.income.findMany({
      where: { householdId, createdById: targetUserId, mirrorKey: { not: null } },
      select: { mirrorKey: true },
    }),
    prisma.currencyIncome.findMany({
      where: { householdId, createdById: targetUserId, mirrorKey: { not: null } },
      select: { mirrorKey: true },
    }),
  ]);

  const expenseMirrorKeys = [...new Set(expenseRows.map((row) => row.mirrorKey).filter(Boolean) as string[])];
  const incomeMirrorKeys = [...new Set(incomeRows.map((row) => row.mirrorKey).filter(Boolean) as string[])];
  const currencyMirrorKeys = [...new Set(currencyRows.map((row) => row.mirrorKey).filter(Boolean) as string[])];

  if (expenseMirrorKeys.length > 0) {
    await prisma.expense.deleteMany({
      where: {
        householdId: personal.id,
        createdById: targetUserId,
        mirrorKey: { in: expenseMirrorKeys },
      },
    });
  }

  if (incomeMirrorKeys.length > 0) {
    await prisma.income.deleteMany({
      where: {
        householdId: personal.id,
        createdById: targetUserId,
        mirrorKey: { in: incomeMirrorKeys },
      },
    });
  }

  if (currencyMirrorKeys.length > 0) {
    await prisma.currencyIncome.deleteMany({
      where: {
        householdId: personal.id,
        createdById: targetUserId,
        mirrorKey: { in: currencyMirrorKeys },
      },
    });
  }
};

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

  const existing = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: user.id, householdId } },
    select: { id: true, role: true },
  });

  const member = await prisma.householdMember.upsert({
    where: { userId_householdId: { userId: user.id, householdId } },
    update: { role },
    create: {
      userId: user.id,
      householdId,
      role,
    },
  });

  const actorName = session.user.name || session.user.email || "Невідомий користувач";
  const targetName = user.name || user.email || "Невідомий користувач";
  const action = existing
    ? "змінив(ла) роль учасника"
    : "додав(ла) учасника";

  await notifyRoomMembers({
    householdId,
    actorUserId: session.user.id,
    title: "Учасники кімнати",
    body: `${actorName} ${action}: ${targetName}`,
  });

  return NextResponse.json({ id: member.id, userId: member.userId, role: member.role });
}

export async function DELETE(request: Request, context: Params) {
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

  const body = await request.json().catch(() => ({}));
  const targetUserId = String(body.userId ?? "").trim();

  if (!targetUserId) {
    return NextResponse.json({ error: "Member userId is required." }, { status: 400 });
  }

  const target = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId: targetUserId, householdId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Owner cannot be removed." }, { status: 400 });
  }

  const canManageMembers = membership.role === "OWNER" || membership.role === "ADMIN";
  const isSelfRemoval = target.user.id === session.user.id;

  if (!canManageMembers && !isSelfRemoval) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await cleanupPersonalMirrorsOnRoomLeave(householdId, target.user.id);
  await prisma.householdMember.delete({ where: { id: target.id } });

  const actorName = session.user.name || session.user.email || "Невідомий користувач";
  const targetName = target.user.name || target.user.email || "Невідомий користувач";

  await notifyRoomMembers({
    householdId,
    actorUserId: session.user.id,
    title: "Учасники кімнати",
    body: `${actorName} видалив(ла) учасника: ${targetName}`,
  });

  if (target.user.id !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: target.user.id,
        type: "ROOM_DELETED",
        title: "Учасники кімнати",
        body: `${actorName} видалив(ла) вас із кімнати`,
      },
    });

    await sendPushToUser(target.user.id, {
      title: "Учасники кімнати",
      body: `${actorName} видалив(ла) вас із кімнати`,
      url: "/",
    }).catch(() => ({ sent: 0 }));
  }

  return NextResponse.json({ ok: true });
}
