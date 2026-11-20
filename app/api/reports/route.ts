import { NextRequest, NextResponse } from "next/server";
import { hasRole, readSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { getComplaintEventSummary } from "@/lib/mongo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN", "WARDEN"])) return NextResponse.json({ error: "Reports are available to Admin and Warden roles." }, { status: 403 });
  try {
    const pool = getPool();
    const [occupancy, complaintCategories, priorityStatus, unallocatedStudents] = await Promise.all([
      pool.query(`SELECT hostel_name, SUM(capacity)::int AS total_beds, SUM(occupied_beds)::int AS occupied_beds,
        SUM(available_beds)::int AS available_beds FROM room_availability GROUP BY hostel_name ORDER BY hostel_name`),
      pool.query(`SELECT cc.category_name, COUNT(c.complaint_id)::int AS complaint_count,
        COUNT(c.complaint_id) FILTER (WHERE c.status IN ('PENDING','IN_PROGRESS'))::int AS open_count
        FROM complaint_category cc LEFT JOIN complaint c ON c.category_id=cc.category_id
        GROUP BY cc.category_id, cc.category_name HAVING COUNT(c.complaint_id) > 0 ORDER BY complaint_count DESC, cc.category_name`),
      pool.query(`SELECT priority, status, COUNT(*)::int AS total FROM complaint GROUP BY priority, status ORDER BY priority, status`),
      pool.query(`SELECT s.student_id, s.name, s.course, s.year FROM student s
        WHERE NOT EXISTS (SELECT 1 FROM room_allocation ra WHERE ra.student_id=s.student_id AND ra.status='ACTIVE') ORDER BY s.name`),
    ]);
    let mongoEventSummary: unknown[] = [];
    let mongoAvailable = true;
    try { mongoEventSummary = await getComplaintEventSummary(); } catch { mongoAvailable = false; }
    return NextResponse.json({ generatedAt: new Date().toISOString(), occupancy: occupancy.rows,
      complaintCategories: complaintCategories.rows, priorityStatus: priorityStatus.rows,
      unallocatedStudents: unallocatedStudents.rows, mongoAvailable, mongoEventSummary });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate reports." }, { status: 503 }); }
}
