import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

const resolveCurrentUser = async () => {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.id) {
    const byId = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true } });
    if (byId) return byId;
  }

  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, email: true } });
    if (byEmail) return byEmail;
  }

  return null;
};

export async function PATCH(request: Request, context: Params) {
  try {
    const currentUser = await resolveCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: householdId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const nextName = String(body.name ?? "").trim();

    if (!nextName) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }

    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: currentUser.id,
          householdId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can rename room." }, { status: 403 });
    }

    const household = await prisma.household.update({
      where: { id: householdId },
      data: { name: nextName },
      select: { id: true, name: true },
    });

    return NextResponse.json({ id: household.id, name: household.name });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to rename room.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const currentUser = await resolveCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: householdId } = await context.params;

    const membership = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: currentUser.id,
          householdId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can delete room." }, { status: 403 });
    }

    const householdWithMembers = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!householdWithMembers) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const notifyUserIds = householdWithMembers.members
      .map((member) => member.userId)
      .filter((userId) => userId !== currentUser.id);

    await prisma.$transaction(async (tx) => {
      if (notifyUserIds.length > 0) {
        await tx.notification.createMany({
          data: notifyUserIds.map((userId) => ({
            userId,
            type: "ROOM_DELETED",
            title: "Кімнату видалено",
            body: `Кімнату \"${householdWithMembers.name}\" було видалено власником.`,
          })),
        });
      }

      await tx.household.delete({ where: { id: householdId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to delete room.",
      },
      { status: 500 },
    );
  }
}
