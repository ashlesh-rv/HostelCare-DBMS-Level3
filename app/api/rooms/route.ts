import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hasRole, readSession } from "@/lib/auth";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const result = user.role === "STUDENT"
      ? await getPool().query(`SELECT room_id, hostel_name, hostel_id, room_number, floor, capacity, room_type, maintenance_status, occupied_beds, available_beds
          FROM room_availability WHERE room_id IN (SELECT room_id FROM room_allocation WHERE student_id=$1 AND status='ACTIVE') ORDER BY room_number`, [user.studentId])
      : await getPool().query(`SELECT room_id, hostel_name, hostel_id, room_number, floor, capacity, room_type, maintenance_status, occupied_beds, available_beds
          FROM room_availability ORDER BY hostel_name, floor, room_number`);
    return NextResponse.json({ rooms: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load rooms." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN"])) return NextResponse.json({ error: "Only an Admin can create rooms." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const hostelId = Number(body.hostelId);
  const roomNumber = typeof body.roomNumber === "string" ? body.roomNumber.trim() : "";
  const floor = Number(body.floor); const capacity = Number(body.capacity);
  const roomType = typeof body.roomType === "string" ? body.roomType.toUpperCase() : "DOUBLE";
  const status = body.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE";
  if (!Number.isInteger(hostelId) || hostelId <= 0 || !roomNumber || roomNumber.length > 20 || !Number.isInteger(floor) || floor < 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 20 || !["SINGLE","DOUBLE","TRIPLE","DORMITORY"].includes(roomType)) {
    return NextResponse.json({ error: "Enter a valid hostel, room number, floor, capacity (1–20), and room type." }, { status: 400 });
  }
  try {
    const result = await getPool().query(`INSERT INTO room(hostel_id, room_number, floor, capacity, room_type, status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [hostelId, roomNumber, floor, capacity, roomType, status]);
    return NextResponse.json({ room: result.rows[0] }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") return NextResponse.json({ error: "That room number already exists in this hostel." }, { status: 409 });
    if (pgError.code === "23503") return NextResponse.json({ error: "Hostel not found." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create room." }, { status: 503 });
  }
}
