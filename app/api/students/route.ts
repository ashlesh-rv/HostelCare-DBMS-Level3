import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hasRole, readSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const pool = getPool();
    const result = user.role === "STUDENT"
      ? await pool.query(`SELECT s.student_id, s.name, s.email, s.phone, s.course, s.year, r.room_number, h.hostel_name
          FROM student s LEFT JOIN room_allocation ra ON ra.student_id=s.student_id AND ra.status='ACTIVE'
          LEFT JOIN room r ON r.room_id=ra.room_id LEFT JOIN hostel h ON h.hostel_id=r.hostel_id
          WHERE s.student_id=$1`, [user.studentId])
      : await pool.query(`SELECT s.student_id, s.name, s.email, s.phone, s.course, s.year, r.room_number, h.hostel_name
          FROM student s LEFT JOIN room_allocation ra ON ra.student_id=s.student_id AND ra.status='ACTIVE'
          LEFT JOIN room r ON r.room_id=ra.room_id LEFT JOIN hostel h ON h.hostel_id=r.hostel_id
          ORDER BY s.student_id DESC`);
    return NextResponse.json({ students: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load students." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN"])) return NextResponse.json({ error: "Only an Admin can register students." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const course = typeof body.course === "string" ? body.course.trim() : "";
  const year = Number(body.year);
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 100 || !/^\+?[0-9 -]{8,15}$/.test(phone) || !course || course.length > 50 || !Number.isInteger(year) || year < 1 || year > 6) {
    return NextResponse.json({ error: "Enter a valid name, email, phone, course, and year (1–6)." }, { status: 400 });
  }
  try {
    const result = await getPool().query(`INSERT INTO student (name,email,phone,course,year) VALUES ($1,$2,$3,$4,$5)
      RETURNING student_id,name,email,phone,course,year`, [name,email,phone,course,year]);
    return NextResponse.json({ student: result.rows[0] }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") return NextResponse.json({ error: "A student with this email already exists." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create student." }, { status: 503 });
  }
}
