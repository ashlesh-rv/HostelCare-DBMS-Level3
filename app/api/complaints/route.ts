import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { logComplaintEvent } from "@/lib/mongo";
import { readSession } from "@/lib/auth";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const pool = getPool();
    const studentOnly = user.role === "STUDENT";
    const [complaintsResult, studentsResult, categoriesResult, wardensResult] = await Promise.all([
      studentOnly
        ? pool.query(`SELECT c.complaint_id,c.student_id,s.name AS student_name,c.category_id,cc.category_name,c.warden_id,w.name AS warden_name,c.description,c.date_reported,c.status,c.priority
            FROM complaint c JOIN student s ON s.student_id=c.student_id JOIN complaint_category cc ON cc.category_id=c.category_id
            LEFT JOIN warden w ON w.warden_id=c.warden_id WHERE c.student_id=$1 ORDER BY c.date_reported DESC`, [user.studentId])
        : pool.query(`SELECT c.complaint_id,c.student_id,s.name AS student_name,c.category_id,cc.category_name,c.warden_id,w.name AS warden_name,c.description,c.date_reported,c.status,c.priority
            FROM complaint c JOIN student s ON s.student_id=c.student_id JOIN complaint_category cc ON cc.category_id=c.category_id
            LEFT JOIN warden w ON w.warden_id=c.warden_id ORDER BY c.date_reported DESC`),
      studentOnly
        ? pool.query("SELECT student_id, name, email, course, year FROM student WHERE student_id=$1", [user.studentId])
        : pool.query("SELECT student_id, name, email, course, year FROM student ORDER BY name"),
      pool.query("SELECT category_id, category_name, description FROM complaint_category ORDER BY category_name"),
      user.role === "ADMIN" || user.role === "WARDEN"
        ? pool.query("SELECT warden_id, name, hostel_id FROM warden ORDER BY name")
        : Promise.resolve({ rows: [] }),
    ]);
    return NextResponse.json({ complaints: complaintsResult.rows, students: studentsResult.rows, categories: categoriesResult.rows, wardens: wardensResult.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load complaints." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const studentId = user.role === "STUDENT" ? Number(user.studentId) : Number(body.studentId);
  const categoryId = Number(body.categoryId);
  const wardenId = user.role === "ADMIN" || user.role === "WARDEN"
    ? (body.wardenId === undefined || body.wardenId === null || body.wardenId === "" ? null : Number(body.wardenId)) : null;
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const priorityList = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const priority = typeof body.priority === "string" && priorityList.includes(body.priority.toUpperCase()) ? body.priority.toUpperCase() : "MEDIUM";
  if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(categoryId) || categoryId <= 0 || description.length < 5 || description.length > 2000) {
    return NextResponse.json({ error: "Provide a valid student, category, and description (5–2000 characters)." }, { status: 400 });
  }
  if (wardenId !== null && (!Number.isInteger(wardenId) || wardenId <= 0)) return NextResponse.json({ error: "wardenId must be a valid positive integer or null." }, { status: 400 });
  if (user.role === "WARDEN" && wardenId !== null && wardenId !== user.wardenId) return NextResponse.json({ error: "A Warden cannot assign a new complaint to another Warden." }, { status: 403 });
  try {
    const result = await getPool().query(`INSERT INTO complaint(student_id,category_id,warden_id,description,priority)
      VALUES($1,$2,$3,$4,$5) RETURNING complaint_id,student_id,category_id,warden_id,description,date_reported,status,priority`, [studentId, categoryId, wardenId, description, priority]);
    const complaint = result.rows[0];
    let activityLogged = false;
    try {
      await logComplaintEvent({ complaintId: complaint.complaint_id, action: "CREATED", actor: `${user.role.toLowerCase()}:${user.userId}`, newStatus: complaint.status, note: description });
      activityLogged = true;
    } catch { /* PostgreSQL is the system of record; MongoDB outage is surfaced in the response. */ }
    return NextResponse.json({ complaint, activityLogged }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23503") return NextResponse.json({ error: "Student, category, or warden ID does not exist." }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create complaint." }, { status: 503 });
  }
}
