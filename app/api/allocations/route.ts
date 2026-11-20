import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hasRole, readSession } from "@/lib/auth";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const result = user.role === "STUDENT"
      ? await getPool().query(`SELECT ra.allocation_id, ra.student_id, s.name AS student_name, ra.room_id, r.room_number, h.hostel_name, ra.allocation_date, ra.vacating_date, ra.status
          FROM room_allocation ra JOIN student s ON s.student_id=ra.student_id JOIN room r ON r.room_id=ra.room_id JOIN hostel h ON h.hostel_id=r.hostel_id
          WHERE ra.student_id=$1 ORDER BY ra.allocation_date DESC`, [user.studentId])
      : await getPool().query(`SELECT ra.allocation_id, ra.student_id, s.name AS student_name, ra.room_id, r.room_number, h.hostel_name, ra.allocation_date, ra.vacating_date, ra.status
          FROM room_allocation ra JOIN student s ON s.student_id=ra.student_id JOIN room r ON r.room_id=ra.room_id JOIN hostel h ON h.hostel_id=r.hostel_id
          ORDER BY ra.allocation_date DESC`);
    return NextResponse.json({ allocations: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load allocation history." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN", "WARDEN"])) return NextResponse.json({ error: "Only Admin or Warden can allocate rooms." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const studentId = Number(body.studentId);
  const roomId = Number(body.roomId);
  const allocationDate = typeof body.allocationDate === "string" && body.allocationDate ? body.allocationDate : new Date().toISOString().slice(0, 10);
  if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(roomId) || roomId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(allocationDate)) {
    return NextResponse.json({ error: "Provide valid studentId, roomId, and allocationDate values." }, { status: 400 });
  }
  const pool = getPool(); const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const room = await client.query("SELECT room_id, status FROM room WHERE room_id=$1 FOR UPDATE", [roomId]);
    if (!room.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Room not found." }, { status: 404 }); }
    if (room.rows[0].status === "MAINTENANCE") { await client.query("ROLLBACK"); return NextResponse.json({ error: "This room is under maintenance." }, { status: 409 }); }
    const active = await client.query("SELECT 1 FROM room_allocation WHERE student_id=$1 AND status='ACTIVE'", [studentId]);
    if (active.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "This student already has an active room allocation." }, { status: 409 }); }
    const result = await client.query(`INSERT INTO room_allocation(student_id, room_id, allocation_date, status)
      VALUES($1,$2,$3,'ACTIVE') RETURNING allocation_id, student_id, room_id, allocation_date, status`, [studentId, roomId, allocationDate]);
    await client.query("COMMIT");
    return NextResponse.json({ allocation: result.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    const pgError = error as { code?: string };
    const message = error instanceof Error ? error.message : "Could not allocate the room.";
    if (pgError.code === "23503") return NextResponse.json({ error: "The selected student or room does not exist." }, { status: 400 });
    if (pgError.code === "23505" || message.includes("is full") || message.includes("maintenance")) return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: message }, { status: 400 });
  } finally { client.release(); }
}
