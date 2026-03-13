import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

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

export async function POST(request: Request) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { title?: string; body?: string; url?: string };
  const title = String(body.title || "Сповіщення").trim() || "Сповіщення";
  const message = String(body.body || "Тестове push-сповіщення").trim() || "Тестове push-сповіщення";
  const url = String(body.url || "/").trim() || "/";

  const result = await sendPushToUser(userId, { title, body: message, url });
  return NextResponse.json({ ok: true, sent: result.sent });
}
