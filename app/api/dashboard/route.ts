import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Please sign in to view the dashboard." }, { status: 401 });
  try {
    const pool = getPool();
    if (user.role === "STUDENT") {
      const [countsResult, recentResult] = await Promise.all([
        pool.query(`SELECT 1::int AS students, 0::int AS rooms, 0::int AS "availableBeds",
          (SELECT COUNT(*)::int FROM complaint WHERE student_id = $1 AND status IN ('PENDING','IN_PROGRESS')) AS "openComplaints"`, [user.studentId]),
        pool.query(`SELECT c.complaint_id, s.name AS student_name, cc.category_name, c.description, c.status, c.priority, c.date_reported
          FROM complaint c JOIN student s ON s.student_id=c.student_id
          JOIN complaint_category cc ON cc.category_id=c.category_id
          WHERE c.student_id=$1 ORDER BY c.date_reported DESC LIMIT 6`, [user.studentId]),
      ]);
      return NextResponse.json({ counts: countsResult.rows[0], recentComplaints: recentResult.rows, roomAvailability: [] });
    }
    const [countsResult, recentResult, roomResult] = await Promise.all([
      pool.query(`SELECT (SELECT COUNT(*)::INT FROM student) AS students,
        (SELECT COUNT(*)::INT FROM room) AS rooms,
        (SELECT COALESCE(SUM(available_beds),0)::INT FROM room_availability) AS "availableBeds",
        (SELECT COUNT(*)::INT FROM complaint WHERE status IN ('PENDING','IN_PROGRESS')) AS "openComplaints"`),
      pool.query(`SELECT c.complaint_id, s.name AS student_name, cc.category_name, c.description,
        c.status, c.priority, c.date_reported FROM complaint c
        JOIN student s ON s.student_id=c.student_id JOIN complaint_category cc ON cc.category_id=c.category_id
        ORDER BY c.date_reported DESC LIMIT 6`),
      pool.query(`SELECT room_id, hostel_name, room_number, room_type, capacity, occupied_beds, available_beds, maintenance_status
        FROM room_availability ORDER BY hostel_name, floor, room_number LIMIT 10`),
    ]);
    return NextResponse.json({ counts: countsResult.rows[0], recentComplaints: recentResult.rows, roomAvailability: roomResult.rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dashboard query failed." }, { status: 503 });
  }
}
