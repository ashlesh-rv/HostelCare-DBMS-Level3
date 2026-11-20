import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const result = await getPool().query("SELECT hostel_id, hostel_name, location, gender_type FROM hostel ORDER BY hostel_name");
    return NextResponse.json({ hostels: result.rows });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load hostels." }, { status: 503 }); }
}
