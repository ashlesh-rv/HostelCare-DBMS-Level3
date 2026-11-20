import { NextRequest, NextResponse } from "next/server";
import { hasRole, readSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN", "WARDEN"])) return NextResponse.json({ error: "Only Admin or Warden can vacate a room." }, { status: 403 });
  const allocationId = Number((await context.params).id);
  if (!Number.isInteger(allocationId) || allocationId <= 0) return NextResponse.json({ error: "Invalid allocation ID." }, { status: 400 });
  let body: { vacatingDate?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const vacatingDate = typeof body.vacatingDate === "string" && body.vacatingDate ? body.vacatingDate : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vacatingDate)) return NextResponse.json({ error: "Use a date in YYYY-MM-DD format." }, { status: 400 });
  try {
    const result = await getPool().query(`UPDATE room_allocation SET status='VACATED', vacating_date=$2
      WHERE allocation_id=$1 AND status='ACTIVE' AND allocation_date <= $2
      RETURNING allocation_id, student_id, room_id, allocation_date, vacating_date, status`, [allocationId, vacatingDate]);
    if (!result.rowCount) return NextResponse.json({ error: "Active allocation not found, or vacating date is before allocation date." }, { status: 404 });
    return NextResponse.json({ allocation: result.rows[0] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not vacate the room." }, { status: 400 }); }
}
