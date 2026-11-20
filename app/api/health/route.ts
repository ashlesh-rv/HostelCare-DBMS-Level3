import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getMongoDb } from "@/lib/mongo";

export const runtime = "nodejs";

export async function GET() {
  const result: { postgres: string; mongodb: string; message?: string } = { postgres: "not checked", mongodb: "not checked" };

  try {
    await getPool().query("SELECT 1");
    result.postgres = "connected";
  } catch (error) {
    result.postgres = "disconnected";
    result.message = error instanceof Error ? error.message : "PostgreSQL connection failed";
  }

  try {
    await (await getMongoDb()).command({ ping: 1 });
    result.mongodb = "connected";
  } catch (error) {
    result.mongodb = "disconnected";
    result.message = [result.message, error instanceof Error ? error.message : "MongoDB connection failed"].filter(Boolean).join("; ");
  }

  const ok = result.postgres === "connected" && result.mongodb === "connected";
  return NextResponse.json(result, { status: ok ? 200 : 503 });
}
