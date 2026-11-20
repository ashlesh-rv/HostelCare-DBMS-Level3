import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only an Admin can edit student records." }, { status: 403 });
  const studentId = Number((await context.params).id);
  if (!Number.isInteger(studentId) || studentId <= 0) return NextResponse.json({ error: "Invalid student ID." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const course = typeof body.course === "string" ? body.course.trim() : "";
  const year = Number(body.year);
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 100 || !/^\+?[0-9 -]{8,15}$/.test(phone) || !course || course.length > 50 || !Number.isInteger(year) || year < 1 || year > 6) return NextResponse.json({ error: "Enter valid student details. Year must be between 1 and 6." }, { status: 400 });
  try {
    const result = await getPool().query(`UPDATE student SET name=$2,email=$3,phone=$4,course=$5,year=$6 WHERE student_id=$1
      RETURNING student_id,name,email,phone,course,year`, [studentId, name, email, phone, course, year]);
    if (!result.rowCount) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json({ student: result.rows[0] });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") return NextResponse.json({ error: "A student with this email already exists." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update student." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only an Admin can delete student records." }, { status: 403 });
  const studentId = Number((await context.params).id);
  if (!Number.isInteger(studentId) || studentId <= 0) return NextResponse.json({ error: "Invalid student ID." }, { status: 400 });
  try {
    const result = await getPool().query("DELETE FROM student WHERE student_id=$1 RETURNING student_id", [studentId]);
    if (!result.rowCount) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json({ ok: true, studentId: result.rows[0].student_id });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23503") return NextResponse.json({ error: "This student has allocation, complaint, or login history and cannot be deleted; keep the record for referential integrity." }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete student." }, { status: 400 });
  }
}
