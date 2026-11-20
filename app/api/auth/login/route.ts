import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const result = await getPool().query(
      `SELECT user_id, full_name, email, password_hash, role, student_id, warden_id
         FROM app_user WHERE lower(email) = $1 AND is_active = TRUE LIMIT 1`, [email],
    );
    const row = result.rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const token = createSessionToken({
      userId: row.user_id, fullName: row.full_name, email: row.email, role: row.role,
      studentId: row.student_id, wardenId: row.warden_id,
    });
    const response = NextResponse.json({ user: {
      userId: row.user_id, fullName: row.full_name, email: row.email, role: row.role,
      studentId: row.student_id, wardenId: row.warden_id,
    } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", maxAge: SESSION_TTL,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 503 });
  }
}
