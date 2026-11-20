import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { getMongoDb } from "@/lib/mongo";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const complaintId = Number((await context.params).id);
  if (!Number.isInteger(complaintId) || complaintId <= 0) return NextResponse.json({ error: "Invalid complaint ID." }, { status: 400 });
  try {
    const ownership = await getPool().query("SELECT student_id, warden_id FROM complaint WHERE complaint_id=$1", [complaintId]);
    if (!ownership.rowCount) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    if (user.role === "STUDENT" && ownership.rows[0].student_id !== user.studentId) return NextResponse.json({ error: "You can view only your own complaint history." }, { status: 403 });
    if (user.role === "WARDEN" && ownership.rows[0].warden_id !== null && ownership.rows[0].warden_id !== user.wardenId) return NextResponse.json({ error: "This complaint is assigned to another warden." }, { status: 403 });
    const db = await getMongoDb();
    const events = await db.collection("complaint_events").find({ complaintId }).sort({ createdAt: -1 }).limit(100).project({ _id: 0 }).toArray();
    return NextResponse.json({ events, store: "MongoDB", count: events.length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load complaint activity history." }, { status: 503 }); }
}
