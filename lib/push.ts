import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type PushConfigState = {
  configured: boolean;
  publicKey: string;
  privateKey: string;
};

const globalForPush = globalThis as unknown as { __cashPushState?: PushConfigState };

const ensurePushState = (): PushConfigState => {
  if (globalForPush.__cashPushState) {
    return globalForPush.__cashPushState;
  }

  const generated = webpush.generateVAPIDKeys();
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    generated.publicKey;
  const privateKey = process.env.VAPID_PRIVATE_KEY || generated.privateKey;

  const state: PushConfigState = {
    configured: false,
    publicKey,
    privateKey,
  };

  globalForPush.__cashPushState = state;
  return state;
};

const ensureConfigured = () => {
  const state = ensurePushState();
  if (state.configured) return state;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:cashflow@example.com",
    state.publicKey,
    state.privateKey,
  );
  state.configured = true;
  return state;
};

export const getPublicVapidKey = () => ensureConfigured().publicKey;

export const saveSubscription = async (userId: string, subscription: WebPushSubscription) => {
  ensureConfigured();
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
    },
  });
};

export const removeSubscription = async (userId: string, endpoint: string) => {
  ensureConfigured();
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
};

export const sendPushToUser = async (userId: string, payload: PushPayload) => {
  ensureConfigured();

  const current = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, authKey: true },
  });

  if (current.length === 0) return { sent: 0 };

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const subscription of current) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.authKey,
          },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(subscription.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: { in: staleEndpoints },
      },
    });
  }

  return { sent };
};
