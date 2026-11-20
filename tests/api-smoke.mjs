// Read-only API smoke checks. Start the app and initialize PostgreSQL first:
//   npm run dev
// Then in another terminal: node tests/api-smoke.mjs
const baseUrl = process.env.BASE_URL || "http://localhost:3000";
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { passed += 1; console.log(`PASS ${message}`); }
  else { failed += 1; console.error(`FAIL ${message}`); }
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  const setCookie = response.headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
  return { response, body, cookie: setCookie.split(";")[0] };
}

async function request(path, cookie, options = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set("Cookie", cookie);
  return fetch(`${baseUrl}${path}`, { ...options, headers, cache: "no-store" });
}

try {
  const unauthenticated = await request("/api/students");
  assert(unauthenticated.status === 401, "protected endpoint rejects unauthenticated requests");

  const invalidLogin = await login("admin@hostelcare.demo", "not-the-password");
  assert(invalidLogin.response.status === 401, "invalid credentials are rejected");

  const admin = await login("admin@hostelcare.demo", "Admin@123");
  assert(admin.response.status === 200 && admin.body.user?.role === "ADMIN" && Boolean(admin.cookie), "Admin login creates a session cookie");
  if (admin.cookie) {
    for (const endpoint of ["/api/dashboard", "/api/students", "/api/rooms", "/api/allocations", "/api/complaints", "/api/reports"]) {
      const response = await request(endpoint, admin.cookie);
      assert(response.ok, `Admin can access ${endpoint} (HTTP ${response.status})`);
    }
  }

  const student = await login("student@hostelcare.demo", "Student@123");
  assert(student.response.status === 200 && student.body.user?.role === "STUDENT" && Boolean(student.cookie), "Student login creates a session cookie");
  if (student.cookie) {
    const studentComplaints = await request("/api/complaints", student.cookie);
    const studentBody = await studentComplaints.json();
    assert(studentComplaints.ok && Array.isArray(studentBody.complaints), "Student can view their complaint register");
    assert((studentBody.students || []).length <= 1, "Student endpoint does not return other students");
    const allocationDenied = await request("/api/allocations", student.cookie, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: 1, roomId: 1 }) });
    assert(allocationDenied.status === 403, "Student cannot allocate rooms through the API");
    const reportsDenied = await request("/api/reports", student.cookie);
    assert(reportsDenied.status === 403, "Student cannot access staff reports");
  }

  const warden = await login("warden@hostelcare.demo", "Warden@123");
  assert(warden.response.status === 200 && warden.body.user?.role === "WARDEN", "Warden login has the Warden role");
  if (warden.cookie) {
    const roomCreateDenied = await request("/api/rooms", warden.cookie, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostelId: 1, roomNumber: "999", floor: 1, capacity: 2, roomType: "DOUBLE" }) });
    assert(roomCreateDenied.status === 403, "Warden cannot create rooms (Admin-only operation)");
  }
} catch (error) {
  failed += 1;
  console.error(`FAIL Smoke test could not complete: ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`\nSmoke test summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
