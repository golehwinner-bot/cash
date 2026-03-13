import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

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


export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? "").trim();

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code format." }, { status: 400 });
    }

    const household = await prisma.household.findFirst({
      where: {
        joinCode: code,
        joinCodeExpiresAt: { gt: new Date() },
      },
      select: { id: true, name: true, joinRole: true },
    });

    if (!household) {
      return NextResponse.json({ error: "Code is invalid or expired." }, { status: 404 });
    }

    const existingMembership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: session.user.id,
          householdId: household.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ ok: true, householdId: household.id, alreadyMember: true });
    }

    const role = household.joinRole === "ADMIN" ? "ADMIN" : "MEMBER";

    await prisma.$transaction([
      prisma.householdMember.create({
        data: {
          userId: session.user.id,
          householdId: household.id,
          role,
        },
      }),
      prisma.household.update({
        where: { id: household.id },
        data: {
          joinCode: null,
          joinRole: null,
          joinCodeExpiresAt: null,
        },
      }),
    ]);


    const actorName = session.user.name || session.user.email || "User";
    const roleLabel = role === "ADMIN" ? "admin" : "member";
    await notifyRoomMembers({
      householdId: household.id,
      actorUserId: session.user.id,
      title: "Room members",
      body: `${actorName} joined room as ${roleLabel}`
    });
    return NextResponse.json({ ok: true, householdId: household.id, role, householdName: household.name });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to join with code.",
      },
      { status: 500 },
    );
  }
}
