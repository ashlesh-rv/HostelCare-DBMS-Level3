import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const { userId, fullName, email, role, studentId, wardenId } = user;
  return NextResponse.json({ user: { userId, fullName, email, role, studentId, wardenId } });
}
