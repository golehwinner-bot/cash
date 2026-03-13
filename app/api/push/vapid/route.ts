import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPublicVapidKey } from "@/lib/push";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ publicKey: getPublicVapidKey() });
}
