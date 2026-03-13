import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Server error";
};

const resolveCurrentUserId = async () => {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.id) {
    const byId = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (byId) return byId.id;
  }

  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }

  return null;
};

const localizeLegacyNotification = (title: string, body: string) => {
  const titleMap: Record<string, string> = {
    "New expense": "Нова витрата",
    "New income": "Новий дохід",
    "Currency spend": "Списання валюти",
    "Currency top up": "Надходження валюти",
    "Room members": "Учасники кімнати",
  };

  let nextTitle = titleMap[title] || title;
  let nextBody = body
    .replaceAll(" UAH", " грн")
    .replaceAll("joined room as", "приєднався(лася) до кімнати як")
    .replaceAll("removed participant:", "видалив(ла) учасника:")
    .replaceAll("removed you from a room", "видалив(ла) вас із кімнати")
    .replaceAll("updated participant role", "змінив(ла) роль учасника")
    .replaceAll("added participant", "додав(ла) учасника");

  if (!nextTitle.trim()) nextTitle = "Сповіщення";
  if (!nextBody.trim()) nextBody = body;

  return { title: nextTitle, body: nextBody };
};

export async function GET() {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        createdAt: true,
        readAt: true,
      },
    });

    const localized = notifications.map((item) => {
      const normalized = localizeLegacyNotification(item.title, item.body);
      return { ...item, title: normalized.title, body: normalized.body };
    });

    return NextResponse.json({ notifications: localized });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to load notifications.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await resolveCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = String(body.id ?? "").trim();

    if (!notificationId) {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? toErrorMessage(error)
            : "Failed to update notifications.",
      },
      { status: 500 },
    );
  }
}
