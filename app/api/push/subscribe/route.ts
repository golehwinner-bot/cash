import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { removeSubscription, saveSubscription } from "@/lib/push";

type IncomingSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
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

export async function POST(request: Request) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { subscription?: IncomingSubscription };
  const endpoint = String(body.subscription?.endpoint || "").trim();
  const p256dh = String(body.subscription?.keys?.p256dh || "").trim();
  const authKey = String(body.subscription?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  await saveSubscription(userId, {
    endpoint,
    keys: {
      p256dh,
      auth: authKey,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = String(body.endpoint || "").trim();
  if (!endpoint) {
    return NextResponse.json({ error: "Invalid unsubscribe payload." }, { status: 400 });
  }

  await removeSubscription(userId, endpoint);
  return NextResponse.json({ ok: true });
}

