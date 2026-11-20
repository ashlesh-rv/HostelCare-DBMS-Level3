import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hasRole, readSession } from "@/lib/auth";
import { logComplaintEvent } from "@/lib/mongo";
export const runtime = "nodejs";
const ALLOWED_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasRole(user, ["ADMIN", "WARDEN"])) return NextResponse.json({ error: "Students cannot change complaint status or assignments." }, { status: 403 });
  const complaintId = Number((await context.params).id);
  if (!Number.isInteger(complaintId) || complaintId <= 0) return NextResponse.json({ error: "Complaint ID must be a positive integer." }, { status: 400 });
  let body: { status?: unknown; wardenId?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const hasStatus = typeof body.status === "string" && body.status.trim() !== "";
  const hasWardenId = Object.prototype.hasOwnProperty.call(body, "wardenId");
  const status = hasStatus ? String(body.status).toUpperCase() : null;
  if (!hasStatus && !hasWardenId) return NextResponse.json({ error: "Provide a status or a warden assignment to update." }, { status: 400 });
  if (hasStatus && !ALLOWED_STATUSES.includes(status as string)) return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}.` }, { status: 400 });
  let wardenId: number | null = null;
  if (hasWardenId) {
    if (body.wardenId === null || body.wardenId === "") wardenId = null;
    else { wardenId = Number(body.wardenId); if (!Number.isInteger(wardenId) || wardenId <= 0) return NextResponse.json({ error: "wardenId must be a positive integer or null." }, { status: 400 }); }
  }
  if (user.role === "WARDEN" && hasWardenId && wardenId !== user.wardenId) return NextResponse.json({ error: "A Warden can assign a complaint only to themselves; an Admin can assign any Warden." }, { status: 403 });
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT complaint_id,student_id,status,warden_id FROM complaint WHERE complaint_id=$1 FOR UPDATE", [complaintId]);
    if (!current.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Complaint not found." }, { status: 404 }); }
    const oldStatus = current.rows[0].status as string;
    const currentWarden = current.rows[0].warden_id as number | null;
    if (user.role === "WARDEN" && currentWarden !== user.wardenId && !(hasWardenId && wardenId === user.wardenId)) {
      await client.query("ROLLBACK"); return NextResponse.json({ error: "Assign this complaint to yourself before updating it." }, { status: 403 });
    }
    const updated = await client.query(`UPDATE complaint SET status=COALESCE($2,status),
      warden_id=CASE WHEN $3::boolean THEN $4::int ELSE warden_id END
      WHERE complaint_id=$1 RETURNING complaint_id,student_id,category_id,warden_id,description,date_reported,status,priority`,
      [complaintId, status, hasWardenId, wardenId]);
    await client.query("COMMIT");
    let activityLogged = false;
    try {
      await logComplaintEvent({ complaintId, action: hasStatus ? "STATUS_CHANGED" : "WARDEN_ASSIGNED", actor: `${user.role.toLowerCase()}:${user.userId}`, oldStatus, newStatus: updated.rows[0].status as string, note: typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "" });
      activityLogged = true;
    } catch { /* Status is saved in PostgreSQL even if the history database is temporarily unavailable. */ }
    return NextResponse.json({ complaint: updated.rows[0], activityLogged });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update complaint." }, { status: 400 });
  } finally { client.release(); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = readSession(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only an Admin can delete a complaint." }, { status: 403 });
  const complaintId = Number((await context.params).id);
  if (!Number.isInteger(complaintId) || complaintId <= 0) return NextResponse.json({ error: "Invalid complaint ID." }, { status: 400 });
  try {
    const result = await getPool().query("DELETE FROM complaint WHERE complaint_id=$1 RETURNING complaint_id", [complaintId]);
    if (!result.rowCount) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    try { await logComplaintEvent({ complaintId, action: "DELETED", actor: `admin:${user.userId}`, note: "Complaint record deleted by administrator." }); } catch { /* Main operation already completed. */ }
    return NextResponse.json({ ok: true, complaintId });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete complaint." }, { status: 400 }); }
}
