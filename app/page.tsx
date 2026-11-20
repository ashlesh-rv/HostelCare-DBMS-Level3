"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type AppUser = {
  userId: number;
  fullName: string;
  email: string;
  role: "ADMIN" | "WARDEN" | "STUDENT";
  studentId: number | null;
  wardenId: number | null;
};

type DashboardData = {
  counts: { students: number; rooms: number; availableBeds: number; openComplaints: number };
  recentComplaints: Array<{ complaint_id: number; student_name: string; category_name: string; description: string; status: string; priority: string; date_reported: string }>;
  roomAvailability: Array<{ room_id: number; hostel_name: string; room_number: string; room_type: string; capacity: number; occupied_beds: number; available_beds: number; maintenance_status: string }>;
};

const staffNavigation = ["Dashboard", "Students", "Rooms & Allocation", "Complaints", "Reports"];
const studentNavigation = ["Dashboard", "Complaints"];

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const navigation = user?.role === "STUDENT" ? studentNavigation : staffNavigation;

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load dashboard.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the database.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.json()).then((body) => {
      if (!cancelled) setUser((body.user || null) as AppUser | null);
    }).catch(() => { if (!cancelled) setUser(null); }).finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (user) void loadDashboard(); }, [user, loadDashboard]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null); setData(null); setActiveNav("Dashboard");
  }

  if (authLoading) return <main className="auth-screen"><div className="auth-card"><div className="brand-mark">HC</div><h1>HostelCare</h1><p>Checking your secure session…</p></div></main>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">HC</div>
        <div className="brand-copy"><strong>HostelCare</strong><span>HOSTEL OPERATIONS</span></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => <button key={item} className={`nav-item ${activeNav === item ? "active" : ""}`} onClick={() => setActiveNav(item)}>
            <span className="nav-icon">{["▦", "♙", "▤", "✳", "▥"][staffNavigation.indexOf(item)] ?? "▦"}</span><span>{item}</span>
            {item === "Complaints" && data?.counts.openComplaints ? <span className="nav-count">{data.counts.openComplaints}</span> : null}
          </button>)}
        </nav>
        <div className="sidebar-bottom"><div className="profile-avatar">{initials}</div><div className="profile-copy"><strong>{user.fullName}</strong><span>{user.role}</span></div><button type="button" className="logout-button" onClick={() => void logout()} title="Sign out" aria-label="Sign out">↪</button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div><div className="topbar-right"><span className="live-dot" /><span>Signed in as {user.role.toLowerCase()}</span><div className="top-avatar">{initials}</div></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">HOSTEL ADMINISTRATION</p><h1>{activeNav === "Dashboard" ? (user.role === "STUDENT" ? "My dashboard" : "Dashboard overview") : activeNav}</h1><p className="subtitle">{user.role === "STUDENT" ? "Track your reported hostel issues and complaint progress." : "Monitor room occupancy and keep student complaints moving toward resolution."}</p></div><button className="refresh-button" onClick={() => void loadDashboard()} disabled={loading}><span>↻</span> Refresh data</button></div>

          {activeNav === "Rooms & Allocation" ? <RoomAllocationModule role={user.role} onAllocationSuccess={() => void loadDashboard()} />
            : activeNav === "Complaints" ? <ComplaintManagementModule onComplaintChange={() => void loadDashboard()} role={user.role} user={user} />
            : activeNav === "Students" ? <StudentManagementModule role={user.role} onStudentChange={() => void loadDashboard()} />
            : activeNav === "Reports" ? <ReportsModule />
            : <>
              {error && <div className="setup-alert"><div className="alert-icon">!</div><div><strong>Database connection needed</strong><p>{error}</p><p>Set <code>DATABASE_URL</code> and <code>MONGODB_URI</code> in <code>.env.local</code>, then run <code>db/schema.sql</code> and <code>db/seed.sql</code>.</p></div></div>}
              <div className="section-heading"><div><h2>{user.role === "STUDENT" ? "Your account at a glance" : "Today at a glance"}</h2><p>Live data from the hostel database</p></div><span className="updated-label">{loading ? "Updating…" : "● Database-backed overview"}</span></div>
              <div className="stats-grid">
                <StatCard label={user.role === "STUDENT" ? "My account" : "Registered students"} value={data?.counts.students} icon="♙" tone="blue" helper={user.role === "STUDENT" ? "Your student record" : "Student records"} loading={loading} />
                <StatCard label={user.role === "STUDENT" ? "Room view" : "Total rooms"} value={data?.counts.rooms} icon="▦" tone="purple" helper={user.role === "STUDENT" ? "Use your allocation record" : "Across all hostels"} loading={loading} />
                <StatCard label={user.role === "STUDENT" ? "Available beds" : "Beds available"} value={data?.counts.availableBeds} icon="⌂" tone="green" helper={user.role === "STUDENT" ? "Not shown to student accounts" : "Excludes maintenance rooms"} loading={loading} />
                <StatCard label={user.role === "STUDENT" ? "My open complaints" : "Open complaints"} value={data?.counts.openComplaints} icon="✳" tone="orange" helper="Pending or in progress" loading={loading} />
              </div>
              <div className="data-grid">
                <section className="panel-card complaints-card"><div className="card-heading"><div><h2>{user.role === "STUDENT" ? "My recent complaints" : "Recent complaints"}</h2><p>Latest issues reported {user.role === "STUDENT" ? "by you" : "by students"}</p></div><button className="text-button" onClick={() => setActiveNav("Complaints")}>View all <span>→</span></button></div>
                  {loading ? <div className="empty-state">Loading complaints…</div> : data?.recentComplaints?.length ? <div className="table-wrap"><table><thead><tr><th>Student / Issue</th><th>Priority</th><th>Status</th></tr></thead><tbody>{data.recentComplaints.map((item) => <tr key={item.complaint_id}><td><div className="issue-title">{item.category_name}</div><div className="issue-subtitle">{item.student_name} · {item.description}</div></td><td><span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td><td><span className={`status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div> : <div className="empty-state">{error ? "Connect PostgreSQL to load complaints." : "No complaints have been recorded yet."}</div>}
                </section>
                {user.role !== "STUDENT" && <section className="panel-card occupancy-card"><div className="card-heading"><div><h2>Room availability</h2><p>Occupied beds vs. capacity</p></div><button className="text-button" onClick={() => setActiveNav("Rooms & Allocation")}>Manage <span>→</span></button></div>
                  {loading ? <div className="empty-state">Loading rooms…</div> : data?.roomAvailability?.length ? <div className="room-list">{data.roomAvailability.slice(0, 5).map((room) => { const percent = room.capacity > 0 ? Math.min(100, Math.round((room.occupied_beds / room.capacity) * 100)) : 0; return <div className="room-row" key={room.room_id}><div className="room-row-top"><div><strong>{room.hostel_name}</strong><span>Room {room.room_number} · {room.room_type.toLowerCase()}</span></div><span className={`room-state ${room.maintenance_status === "MAINTENANCE" ? "maintenance" : room.available_beds === 0 ? "full" : "available"}`}>{room.maintenance_status === "MAINTENANCE" ? "Maintenance" : room.available_beds === 0 ? "Full" : `${room.available_beds} free`}</span></div><div className="progress-track"><div className={`progress-fill ${room.maintenance_status === "MAINTENANCE" ? "muted" : ""}`} style={{ width: `${percent}%` }} /></div><div className="room-footnote">{room.occupied_beds} of {room.capacity} beds occupied</div></div>; })}</div> : <div className="empty-state">No room records found.</div>}
                </section>}
              </div>
              <div className="footer-note"><span className="footer-check">✓</span><span><strong>Level 3 database project</strong> — PostgreSQL stores normalized hostel records; MongoDB stores complaint activity events.</span><span className="footer-tag">MINI PROJECT</span></div>
            </>}
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [email, setEmail] = useState("admin@hostelcare.demo");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not sign in.");
      onLogin(body.user as AppUser);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign in."); }
    finally { setLoading(false); }
  }
  return <main className="auth-screen"><section className="auth-card"><div className="brand-mark">HC</div><p className="eyebrow">HOSTEL OPERATIONS</p><h1>Welcome to HostelCare</h1><p>Sign in to manage room allocation and hostel complaints.</p>{error && <div className="allocation-feedback error"><strong>Sign-in failed</strong><span>{error}</span></div>}<form className="auth-form" onSubmit={submit}><label className="form-field"><span>Email address</span><input type="email" value={email} required onChange={(event) => setEmail(event.target.value)} /></label><label className="form-field"><span>Password</span><input type="password" value={password} required onChange={(event) => setPassword(event.target.value)} /></label><button className="primary-action" disabled={loading}>{loading ? "Signing in…" : "Sign in"}<span>→</span></button></form><div className="demo-credentials"><strong>Demo accounts</strong><span>Admin: admin@hostelcare.demo / Admin@123</span><span>Warden: warden@hostelcare.demo / Warden@123</span><span>Student: student@hostelcare.demo / Student@123</span><small>Demo credentials only; replace before any real deployment.</small></div></section></main>;
}

function StatCard({ label, value, icon, tone, helper, loading }: { label: string; value?: number; icon: string; tone: string; helper: string; loading: boolean }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{loading ? "—" : value ?? "—"}</div><div className="stat-helper">{helper}</div></article>;
}


type StudentRecord = { student_id: number; name: string; email: string; phone: string; course: string; year: number; room_number: string | null; hostel_name: string | null };

function StudentManagementModule({ role, onStudentChange }: { role: AppUser["role"]; onStudentChange: () => void }) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [course, setCourse] = useState("CSE"); const [year, setYear] = useState("1");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await fetch("/api/students", { cache: "no-store" }); const b = await r.json(); if (!r.ok) throw new Error(b.error || "Could not load students."); setStudents(b.students || []); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load students."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = students.filter((s) => [s.name,s.email,s.course,String(s.student_id),s.room_number || ""].some((x) => x.toLowerCase().includes(search.toLowerCase().trim())));
  function resetForm() { setEditingId(null); setName(""); setEmail(""); setPhone(""); setCourse("CSE"); setYear("1"); }
  function beginEdit(s: StudentRecord) { setEditingId(s.student_id); setName(s.name); setEmail(s.email); setPhone(s.phone); setCourse(s.course); setYear(String(s.year)); setNotice(""); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(editingId ? `/api/students/${editingId}` : "/api/students", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, phone, course, year: Number(year) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not save student.");
      setNotice(editingId ? "Student record updated." : `Student #${body.student.student_id} registered.`); resetForm(); await load(); onStudentChange();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save student."); }
    finally { setSaving(false); }
  }
  async function deleteStudent(s: StudentRecord) {
    if (!window.confirm(`Delete student ${s.name}? This is allowed only if no room allocation, complaint, or account references the student.`)) return;
    setError(""); setNotice("");
    try { const response = await fetch(`/api/students/${s.student_id}`, { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not delete student."); setNotice(`Student #${s.student_id} deleted.`); if (editingId === s.student_id) resetForm(); await load(); onStudentChange(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete student."); }
  }
  return <div className="student-module">
    {error && <div className="allocation-feedback error" role="alert"><strong>Action could not be completed</strong><span>{error}</span></div>}{notice && <div className="allocation-feedback success" role="status"><strong>Saved</strong><span>{notice}</span></div>}
    <div className="students-layout">
      <section className="panel-card"><div className="card-heading"><div><h2>{editingId ? `Edit student #${editingId}` : "Register a student"}</h2><p>{role === "ADMIN" ? "Add or update student records." : "Student directory (read-only for this role)."}</p></div></div>
        {role === "ADMIN" ? <form className="allocation-form" onSubmit={submit}>
          <label className="form-field"><span>Full name *</span><input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Student full name" /></label>
          <label className="form-field"><span>Email *</span><input required type="email" maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" /></label>
          <label className="form-field"><span>Phone *</span><input required value={phone} onChange={(e) => setPhone(e.target.value)} pattern="\+?[0-9 -]{8,15}" placeholder="10-digit phone number" /></label>
          <label className="form-field"><span>Course *</span><select value={course} required onChange={(e) => setCourse(e.target.value)}>{["CSE","ISE","ECE","EEE","AIML","ME","Civil","Other"].map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="form-field"><span>Year *</span><select value={year} required onChange={(e) => setYear(e.target.value)}>{[1,2,3,4,5,6].map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
          <button className="primary-action" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Register student"}<span>→</span></button>{editingId && <button type="button" className="secondary-action" onClick={resetForm}>Cancel edit</button>}
        </form> : <div className="empty-state">Only Admin users can add, edit, or delete student records.</div>}
      </section>
      <section className="panel-card"><div className="card-heading"><div><h2>Student directory</h2><p>{students.length} record(s) · active allocation shown when present</p></div><button type="button" className="text-button" onClick={() => void load()}>Refresh ↻</button></div>
        <div className="complaint-filters"><label className="search-field"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, course, ID…" aria-label="Search students" /></label></div>
        {loading ? <div className="empty-state">Loading students…</div> : filtered.length ? <div className="table-wrap"><table className="student-table"><thead><tr><th>ID</th><th>Student</th><th>Course / Year</th><th>Room</th>{role === "ADMIN" && <th>Actions</th>}</tr></thead><tbody>{filtered.map((s) => <tr key={s.student_id}><td>{s.student_id}</td><td><div className="issue-title">{s.name}</div><div className="issue-subtitle">{s.email}</div><div className="issue-subtitle">{s.phone}</div></td><td>{s.course} · Year {s.year}</td><td>{s.room_number ? `${s.hostel_name} / ${s.room_number}` : "Not allocated"}</td>{role === "ADMIN" && <td><div className="student-actions"><button type="button" className="small-action" onClick={() => beginEdit(s)}>Edit</button><button type="button" className="small-action danger" onClick={() => void deleteStudent(s)}>Delete</button></div></td>}</tr>)}</tbody></table></div> : <div className="empty-state">No students match this search.</div>}
      </section>
    </div>
  </div>;
}

type ReportsData = {
  generatedAt: string;
  occupancy: Array<{ hostel_name: string; total_beds: number; occupied_beds: number; available_beds: number }>;
  complaintCategories: Array<{ category_name: string; complaint_count: number; open_count: number }>;
  priorityStatus: Array<{ priority: string; status: string; total: number }>;
  unallocatedStudents: Array<{ student_id: number; name: string; course: string; year: number }>;
  mongoAvailable: boolean;
  mongoEventSummary: Array<{ _id: string; eventCount: number; lastEventAt?: string }>;
};

function ReportsModule() {
  const [reports, setReports] = useState<ReportsData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const r = await fetch("/api/reports", { cache: "no-store" }); const b = await r.json(); if (!r.ok) throw new Error(b.error || "Could not load reports."); setReports(b); } catch (e) { setError(e instanceof Error ? e.message : "Could not load reports."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="reports-page">{error && <div className="allocation-feedback error"><strong>Reports unavailable</strong><span>{error}</span></div>}
    <div className="section-heading"><div><h2>Operational reports</h2><p>SQL aggregations and MongoDB complaint-event analytics.</p></div><button className="refresh-button" onClick={() => void load()} disabled={loading}>↻ Refresh reports</button></div>
    <div className="reports-grid">
      <section className="panel-card"><div className="card-heading"><div><h2>Occupancy by hostel</h2><p>GROUP BY and aggregate functions</p></div></div>{loading ? <div className="empty-state">Loading…</div> : <div className="table-wrap"><table><thead><tr><th>Hostel</th><th>Occupied</th><th>Available</th><th>Total</th></tr></thead><tbody>{reports?.occupancy.map((r) => <tr key={r.hostel_name}><td>{r.hostel_name}</td><td>{r.occupied_beds}</td><td>{r.available_beds}</td><td>{r.total_beds}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel-card"><div className="card-heading"><div><h2>Complaints by category</h2><p>JOIN, GROUP BY, HAVING, ORDER BY</p></div></div>{loading ? <div className="empty-state">Loading…</div> : <div className="table-wrap"><table><thead><tr><th>Category</th><th>Total</th><th>Open</th></tr></thead><tbody>{reports?.complaintCategories.map((r) => <tr key={r.category_name}><td>{r.category_name}</td><td>{r.complaint_count}</td><td>{r.open_count}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel-card"><div className="card-heading"><div><h2>Priority and status</h2><p>Aggregate counts by priority and status</p></div></div>{loading ? <div className="empty-state">Loading…</div> : <div className="table-wrap"><table><thead><tr><th>Priority</th><th>Status</th><th>Count</th></tr></thead><tbody>{reports?.priorityStatus.map((r) => <tr key={`${r.priority}-${r.status}`}><td>{r.priority}</td><td>{r.status.replaceAll("_", " ")}</td><td>{r.total}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel-card"><div className="card-heading"><div><h2>Students without a room</h2><p>NOT EXISTS subquery</p></div></div>{loading ? <div className="empty-state">Loading…</div> : reports?.unallocatedStudents.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Year</th></tr></thead><tbody>{reports.unallocatedStudents.map((s) => <tr key={s.student_id}><td>{s.name} <span className="issue-subtitle">#{s.student_id}</span></td><td>{s.course}</td><td>{s.year}</td></tr>)}</tbody></table></div> : <div className="empty-state">All students have an active allocation.</div>}</section>
      <section className="panel-card"><div className="card-heading"><div><h2>MongoDB complaint event summary</h2><p>NoSQL aggregation: event counts grouped by action</p></div><span className="updated-label">{reports?.mongoAvailable ? "Connected" : "Unavailable"}</span></div>{loading ? <div className="empty-state">Loading…</div> : reports?.mongoAvailable ? reports.mongoEventSummary.length ? <div className="table-wrap"><table><thead><tr><th>Event action</th><th>Count</th><th>Last event</th></tr></thead><tbody>{reports.mongoEventSummary.map((e) => <tr key={e._id}><td>{e._id}</td><td>{e.eventCount}</td><td>{e.lastEventAt ? new Date(e.lastEventAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div> : <div className="empty-state">No activity documents yet; submit or update a complaint first.</div> : <div className="empty-state">MongoDB is not available. Check MONGODB_URI and the MongoDB service.</div>}</section>
    </div><p className="report-timestamp">{reports?.generatedAt ? `Generated ${new Date(reports.generatedAt).toLocaleString()}` : ""}</p>
  </div>;
}

type StudentOption = {
  student_id: number;
  name: string;
  email: string;
  course: string;
  room_number: string | null;
  hostel_name: string | null;
};

type RoomOption = {
  room_id: number; hostel_id: number; hostel_name: string; room_number: string; floor: number; capacity: number;
  room_type: string; maintenance_status: string; occupied_beds: number; available_beds: number;
};
type HostelOption = { hostel_id: number; hostel_name: string; location: string; gender_type: string };
type AllocationRecord = { allocation_id: number; student_id: number; student_name: string; room_id: number; room_number: string; hostel_name: string; allocation_date: string; vacating_date: string | null; status: string };

function RoomAllocationModule({ onAllocationSuccess, role }: { onAllocationSuccess: () => void; role: AppUser["role"] }) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [allocationDate, setAllocationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [newHostelId, setNewHostelId] = useState("");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newFloor, setNewFloor] = useState("0");
  const [newCapacity, setNewCapacity] = useState("2");
  const [newRoomType, setNewRoomType] = useState("DOUBLE");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [vacatingId, setVacatingId] = useState<number | null>(null);

  const loadChoices = useCallback(async () => {
    setLoadingChoices(true);
    setLoadError("");
    try {
      const [studentsResponse, roomsResponse, hostelsResponse, allocationsResponse] = await Promise.all([
        fetch("/api/students", { cache: "no-store" }), fetch("/api/rooms", { cache: "no-store" }),
        fetch("/api/hostels", { cache: "no-store" }), fetch("/api/allocations", { cache: "no-store" }),
      ]);
      const [studentsBody, roomsBody, hostelsBody, allocationsBody] = await Promise.all([studentsResponse.json(), roomsResponse.json(), hostelsResponse.json(), allocationsResponse.json()]);
      if (!studentsResponse.ok) throw new Error(studentsBody.error || "Could not load students.");
      if (!roomsResponse.ok) throw new Error(roomsBody.error || "Could not load room availability.");
      if (!hostelsResponse.ok) throw new Error(hostelsBody.error || "Could not load hostels.");
      if (!allocationsResponse.ok) throw new Error(allocationsBody.error || "Could not load allocation history.");
      setStudents((studentsBody.students || []) as StudentOption[]); setRooms((roomsBody.rooms || []) as RoomOption[]);
      setHostels((hostelsBody.hostels || []) as HostelOption[]); setAllocations((allocationsBody.allocations || []) as AllocationRecord[]);
      if (hostelsBody.hostels?.length) setNewHostelId((current) => current || String(hostelsBody.hostels[0].hostel_id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load students and rooms.");
    } finally {
      setLoadingChoices(false);
    }
  }, []);

  useEffect(() => { void loadChoices(); }, [loadChoices]);

  const eligibleStudents = students.filter((student) => !student.room_number);
  const availableRooms = rooms.filter((room) => room.available_beds > 0 && room.maintenance_status !== "MAINTENANCE");

  async function submitAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(selectedStudent),
          roomId: Number(selectedRoom),
          allocationDate,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Room allocation failed.");
      setFeedback({ kind: "success", text: `Room allocated successfully. Allocation ID: ${body.allocation.allocation_id}.` });
      setSelectedStudent("");
      setSelectedRoom("");
      await loadChoices();
      onAllocationSuccess();
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Room allocation failed." });
    } finally {
      setSubmitting(false);
    }
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback(null); setCreatingRoom(true);
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelId: Number(newHostelId), roomNumber: newRoomNumber.trim(), floor: Number(newFloor), capacity: Number(newCapacity), roomType: newRoomType }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not create room.");
      setFeedback({ kind: "success", text: `Room ${body.room.room_number} created successfully.` }); setNewRoomNumber(""); await loadChoices(); onAllocationSuccess();
    } catch (err) { setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Could not create room." }); }
    finally { setCreatingRoom(false); }
  }

  async function vacateAllocation(item: AllocationRecord) {
    if (item.status !== "ACTIVE") return;
    setFeedback(null); setVacatingId(item.allocation_id);
    try {
      const response = await fetch(`/api/allocations/${item.allocation_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vacatingDate: new Date().toISOString().slice(0, 10) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not vacate room.");
      setFeedback({ kind: "success", text: `Allocation #${item.allocation_id} marked as vacated.` }); await loadChoices(); onAllocationSuccess();
    } catch (err) { setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Could not vacate room." }); }
    finally { setVacatingId(null); }
  }

  return (
    <div className="allocation-page">
      <div className="section-heading allocation-section-heading">
        <div><h2>Allocate a hostel room</h2><p>Select an unallocated student and a room with available beds.</p></div>
        <span className="updated-label">{loadingChoices ? "Loading records…" : `${eligibleStudents.length} students without a room`}</span>
      </div>

      {loadError && <div className="allocation-feedback error" role="alert"><strong>Could not load allocation data</strong><span>{loadError} Check that PostgreSQL is running and the schema and seed files have been executed.</span></div>}
      {feedback && <div className={`allocation-feedback ${feedback.kind}`} role="status"><strong>{feedback.kind === "success" ? "Allocation complete" : "Allocation not completed"}</strong><span>{feedback.text}</span></div>}

      <div className="allocation-layout">
        <section className="panel-card allocation-form-panel">
          <div className="card-heading"><div><h2>New room allocation</h2><p>Fields marked required must be filled in.</p></div><span className="allocation-form-icon">＋</span></div>
          <form className="allocation-form" onSubmit={submitAllocation}>
            <label className="form-field">
              <span>Student <b>*</b></span>
              <select required value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} disabled={loadingChoices || eligibleStudents.length === 0}>
                <option value="">Select a student</option>
                {eligibleStudents.map((student) => <option key={student.student_id} value={student.student_id}>{student.name} · ID {student.student_id} · {student.course}</option>)}
              </select>
              <small>Only students without an active allocation are listed.</small>
            </label>
            <label className="form-field">
              <span>Available room <b>*</b></span>
              <select required value={selectedRoom} onChange={(event) => setSelectedRoom(event.target.value)} disabled={loadingChoices || availableRooms.length === 0}>
                <option value="">Select a room</option>
                {availableRooms.map((room) => <option key={room.room_id} value={room.room_id}>{room.hostel_name} · Room {room.room_number} · {room.available_beds} bed(s) free</option>)}
              </select>
              <small>Full rooms and rooms under maintenance cannot be selected.</small>
            </label>
            <label className="form-field">
              <span>Allocation date <b>*</b></span>
              <input type="date" required value={allocationDate} onChange={(event) => setAllocationDate(event.target.value)} />
            </label>
            {eligibleStudents.length === 0 && !loadingChoices && !loadError && <p className="form-hint">There are no unallocated students. Add a student or vacate an existing allocation first.</p>}
            {availableRooms.length === 0 && !loadingChoices && !loadError && <p className="form-hint">There are no rooms with available beds at the moment.</p>}
            <button className="primary-action" type="submit" disabled={submitting || loadingChoices || !selectedStudent || !selectedRoom || !allocationDate}>
              {submitting ? "Allocating room…" : "Confirm room allocation"} <span>→</span>
            </button>
            <p className="security-note">The database checks room capacity and prevents a student from receiving two active allocations.</p>
          </form>
        </section>

        <section className="panel-card allocation-availability-panel">
          <div className="card-heading"><div><h2>Room availability</h2><p>Choose a room with free capacity.</p></div><button type="button" className="text-button" onClick={() => void loadChoices()}>Refresh <span>↻</span></button></div>
          {loadingChoices ? <div className="empty-state">Loading room availability…</div> : rooms.length ? (
            <div className="availability-list">
              {rooms.map((room) => {
                const maintenance = room.maintenance_status === "MAINTENANCE";
                const full = room.available_beds === 0;
                const selected = selectedRoom === String(room.room_id);
                return <button type="button" key={room.room_id} className={`availability-item ${selected ? "selected" : ""} ${maintenance || full ? "unavailable" : ""}`} disabled={maintenance || full} onClick={() => setSelectedRoom(String(room.room_id))}>
                  <span className="availability-icon">{maintenance ? "!" : "▦"}</span>
                  <span className="availability-details"><strong>{room.hostel_name}</strong><small>Room {room.room_number} · Floor {room.floor} · {room.room_type}</small><span className="availability-meter"><span style={{ width: `${room.capacity ? Math.min(100, Math.round((room.occupied_beds / room.capacity) * 100)) : 0}%` }} /></span></span>
                  <span className={`availability-count ${maintenance ? "maintenance" : full ? "full" : "free"}`}>{maintenance ? "Maintenance" : full ? "Full" : `${room.available_beds} free`}</span>
                </button>;
              })}
            </div>
          ) : <div className="empty-state">No rooms found. Add room records before allocating students.</div>}
          <div className="availability-legend"><span><i className="legend-free" /> Available</span><span><i className="legend-full" /> Full / maintenance</span></div>
        </section>
      </div>
      {role === "ADMIN" && <section className="panel-card room-create-panel"><div className="card-heading"><div><h2>Add a room</h2><p>Room creation is available to Admin accounts only.</p></div></div><form className="room-create-form" onSubmit={createRoom}>
        <label className="form-field"><span>Hostel *</span><select required value={newHostelId} onChange={(e) => setNewHostelId(e.target.value)}>{hostels.map((h) => <option key={h.hostel_id} value={h.hostel_id}>{h.hostel_name}</option>)}</select></label>
        <label className="form-field"><span>Room number *</span><input required maxLength={20} value={newRoomNumber} onChange={(e) => setNewRoomNumber(e.target.value)} placeholder="e.g. 103" /></label>
        <label className="form-field"><span>Floor *</span><input type="number" min="0" required value={newFloor} onChange={(e) => setNewFloor(e.target.value)} /></label>
        <label className="form-field"><span>Bed capacity *</span><input type="number" min="1" max="20" required value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} /></label>
        <label className="form-field"><span>Room type *</span><select value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)}>{["SINGLE","DOUBLE","TRIPLE","DORMITORY"].map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <button className="primary-action" disabled={creatingRoom || !newHostelId || !newRoomNumber.trim()}>{creatingRoom ? "Creating…" : "Create room"}<span>→</span></button>
      </form></section>}
      <section className="panel-card allocation-history-panel"><div className="card-heading"><div><h2>Allocation history</h2><p>Active, vacated, and cancelled records are retained for auditing.</p></div><button type="button" className="text-button" onClick={() => void loadChoices()}>Refresh ↻</button></div>
        {loadingChoices ? <div className="empty-state">Loading allocation history…</div> : allocations.length ? <div className="table-wrap"><table className="student-table"><thead><tr><th>ID</th><th>Student</th><th>Hostel / Room</th><th>Allocated</th><th>Vacated</th><th>Status</th>{role !== "STUDENT" && <th>Action</th>}</tr></thead><tbody>{allocations.map((a) => <tr key={a.allocation_id}><td>{a.allocation_id}</td><td>{a.student_name} <span className="issue-subtitle">#{a.student_id}</span></td><td>{a.hostel_name} / {a.room_number}</td><td>{String(a.allocation_date).slice(0,10)}</td><td>{a.vacating_date ? String(a.vacating_date).slice(0,10) : "—"}</td><td><span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span></td>{role !== "STUDENT" && <td>{a.status === "ACTIVE" ? <button type="button" className="small-action danger" disabled={vacatingId === a.allocation_id} onClick={() => void vacateAllocation(a)}>{vacatingId === a.allocation_id ? "Saving…" : "Vacate"}</button> : "—"}</td>}</tr>)}</tbody></table></div> : <div className="empty-state">No allocation history found yet.</div>}
      </section>
      <div className="allocation-process-note"><strong>How it works:</strong> choose a student → choose an available room → confirm allocation. The system records the allocation date, updates bed availability, and blocks over-capacity allocations.</div>
    </div>
  );
}


type ComplaintRow = {
  complaint_id: number;
  student_id: number;
  student_name: string;
  category_id: number;
  category_name: string;
  warden_id: number | null;
  warden_name: string | null;
  description: string;
  date_reported: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
};

type ComplaintStudentOption = { student_id: number; name: string; email: string; course: string; year: number };
type ComplaintCategoryOption = { category_id: number; category_name: string; description: string };
type WardenOption = { warden_id: number; name: string; hostel_id: number };

function ComplaintManagementModule({ onComplaintChange, role, user }: { onComplaintChange: () => void; role: AppUser["role"]; user: AppUser }) {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [students, setStudents] = useState<ComplaintStudentOption[]>([]);
  const [categories, setCategories] = useState<ComplaintCategoryOption[]>([]);
  const [wardens, setWardens] = useState<WardenOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWarden, setSelectedWarden] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintRow["priority"]>("MEDIUM");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [historyEvents, setHistoryEvents] = useState<Array<{ action: string; actor: string; oldStatus?: string; newStatus?: string; note?: string; createdAt: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/complaints", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load complaints.");
      setComplaints((body.complaints || []) as ComplaintRow[]);
      setStudents((body.students || []) as ComplaintStudentOption[]);
      setCategories((body.categories || []) as ComplaintCategoryOption[]);
      setWardens((body.wardens || []) as WardenOption[]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load complaint records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadComplaints(); }, [loadComplaints]);
  useEffect(() => { if (role === "STUDENT" && user.studentId) setSelectedStudent(String(user.studentId)); }, [role, user.studentId]);

  const filteredComplaints = complaints.filter((item) => {
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [item.student_name, item.category_name, item.description, item.warden_name || "", String(item.complaint_id)]
      .some((value) => value.toLowerCase().includes(needle));
    return matchesStatus && matchesSearch;
  });

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(selectedStudent),
          categoryId: Number(selectedCategory),
          wardenId: role === "ADMIN" && selectedWarden ? Number(selectedWarden) : null,
          description: description.trim(),
          priority,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not submit complaint.");
      setFeedback({
        kind: "success",
        text: body.activityLogged === false
          ? `Complaint #${body.complaint.complaint_id} was saved, but MongoDB activity history was unavailable.`
          : `Complaint #${body.complaint.complaint_id} submitted successfully and added to the complaint history.`,
      });
      if (role !== "STUDENT") setSelectedStudent("");
      setSelectedCategory("");
      setSelectedWarden("");
      setDescription("");
      setPriority("MEDIUM");
      await loadComplaints();
      onComplaintChange();
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Could not submit complaint." });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateComplaintStatus(item: ComplaintRow, newStatus: ComplaintRow["status"]) {
    if (newStatus === item.status) return;
    setFeedback(null);
    setSavingStatusId(item.complaint_id);
    try {
      const response = await fetch(`/api/complaints/${item.complaint_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          actor: "warden:demo",
          note: `Status changed from the Complaint Management screen to ${newStatus.replaceAll("_", " ")}.`,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update complaint status.");
      setFeedback({
        kind: "success",
        text: body.activityLogged === false
          ? `Complaint #${item.complaint_id} status updated, but MongoDB activity history was unavailable.`
          : `Complaint #${item.complaint_id} status updated to ${newStatus.replaceAll("_", " ")}.`,
      });
      await loadComplaints();
      onComplaintChange();
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Could not update complaint status." });
    } finally {
      setSavingStatusId(null);
    }
  }

  async function assignComplaintWarden(item: ComplaintRow, newWardenId: string) {
    if ((newWardenId === "" ? null : Number(newWardenId)) === item.warden_id) return;
    setFeedback(null);
    setSavingAssignmentId(item.complaint_id);
    try {
      const response = await fetch(`/api/complaints/${item.complaint_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardenId: newWardenId ? Number(newWardenId) : null,
          actor: "warden:demo",
          note: newWardenId ? `Assigned to warden ID ${newWardenId}.` : "Warden assignment removed.",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not assign complaint.");
      setFeedback({
        kind: "success",
        text: body.activityLogged === false
          ? `Complaint #${item.complaint_id} assignment updated, but MongoDB activity history was unavailable.`
          : `Complaint #${item.complaint_id} assignment updated.`,
      });
      await loadComplaints();
      onComplaintChange();
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Could not assign complaint." });
    } finally {
      setSavingAssignmentId(null);
    }
  }

  async function viewHistory(item: ComplaintRow) {
    if (historyFor === item.complaint_id) { setHistoryFor(null); setHistoryEvents([]); setHistoryError(""); return; }
    setHistoryFor(item.complaint_id); setHistoryLoading(true); setHistoryError(""); setHistoryEvents([]);
    try {
      const response = await fetch(`/api/complaints/${item.complaint_id}/history`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load complaint history.");
      setHistoryEvents(body.events || []);
    } catch (err) { setHistoryError(err instanceof Error ? err.message : "MongoDB complaint history unavailable."); }
    finally { setHistoryLoading(false); }
  }

  const openCount = complaints.filter((item) => item.status === "PENDING" || item.status === "IN_PROGRESS").length;
  const resolvedCount = complaints.filter((item) => item.status === "RESOLVED").length;
  const urgentCount = complaints.filter((item) => item.priority === "URGENT" && item.status !== "RESOLVED" && item.status !== "REJECTED").length;

  return (
    <div className="complaints-page">
      <div className="complaint-summary-grid">
        <article className="complaint-summary-card"><span className="complaint-summary-icon orange">◷</span><div><span>Open complaints</span><strong>{loading ? "—" : openCount}</strong></div></article>
        <article className="complaint-summary-card"><span className="complaint-summary-icon green">✓</span><div><span>Resolved</span><strong>{loading ? "—" : resolvedCount}</strong></div></article>
        <article className="complaint-summary-card"><span className="complaint-summary-icon red">!</span><div><span>Urgent and open</span><strong>{loading ? "—" : urgentCount}</strong></div></article>
      </div>

      {loadError && <div className="allocation-feedback error" role="alert"><strong>Could not load complaints</strong><span>{loadError} Check the PostgreSQL connection and run the schema and seed SQL files.</span></div>}
      {feedback && <div className={`allocation-feedback ${feedback.kind}`} role="status"><strong>{feedback.kind === "success" ? "Saved successfully" : "Action failed"}</strong><span>{feedback.text}</span></div>}

      <div className="complaints-layout">
        <section className="panel-card complaint-form-panel">
          <div className="card-heading"><div><h2>Submit a complaint</h2><p>{role === "STUDENT" ? "Report an issue for the hostel team to review." : "Record a hostel issue for follow-up."}</p></div><span className="allocation-form-icon">＋</span></div>
          <form className="allocation-form" onSubmit={submitComplaint}>
            {role === "STUDENT" ? <div className="readonly-student"><strong>Reporting student</strong><span>Your complaint is linked to your signed-in student account.</span></div> : <label className="form-field"><span>Student reporting the issue <b>*</b></span>
              <select required value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} disabled={loading || students.length === 0}>
                <option value="">Select a student</option>
                {students.map((student) => <option key={student.student_id} value={student.student_id}>{student.name} · ID {student.student_id} · {student.course}</option>)}
              </select>
            </label>}
            <label className="form-field"><span>Complaint category <b>*</b></span>
              <select required value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} disabled={loading || categories.length === 0}>
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
              </select>
            </label>
            {role === "ADMIN" && <label className="form-field"><span>Assign to warden</span>
              <select value={selectedWarden} onChange={(event) => setSelectedWarden(event.target.value)} disabled={loading}>
                <option value="">Unassigned / assign later</option>
                {wardens.map((warden) => <option key={warden.warden_id} value={warden.warden_id}>{warden.name}</option>)}
              </select>
            </label>}
            <label className="form-field"><span>Priority <b>*</b></span>
              <select required value={priority} onChange={(event) => setPriority(event.target.value as ComplaintRow["priority"])}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="form-field"><span>Describe the issue <b>*</b></span>
              <textarea required minLength={5} maxLength={2000} rows={4} placeholder="Example: The water tap in the bathroom is leaking…" value={description} onChange={(event) => setDescription(event.target.value)} />
              <small>{description.length}/2000 characters</small>
            </label>
            <button className="primary-action" type="submit" disabled={submitting || loading || !selectedStudent || !selectedCategory || description.trim().length < 5}>
              {submitting ? "Submitting complaint…" : "Submit complaint"} <span>→</span>
            </button>
            <p className="security-note">The complaint is stored in PostgreSQL. MongoDB records its activity history when available.</p>
          </form>
        </section>

        <section className="panel-card complaint-list-panel">
          <div className="card-heading"><div><h2>{role === "STUDENT" ? "My complaints" : "Complaint register"}</h2><p>{role === "STUDENT" ? "Track your complaint status and activity." : "Review issues and update their progress."}</p></div><button className="text-button" onClick={() => void loadComplaints()} type="button">Refresh <span>↻</span></button></div>
          <div className="complaint-filters">
            <label className="search-field"><span>⌕</span><input aria-label="Search complaints" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search complaint, student…" /></label>
            <select aria-label="Filter by complaint status" className="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option>
            </select>
          </div>
          {loading ? <div className="empty-state">Loading complaint register…</div> : filteredComplaints.length ? (
            <div className="table-wrap complaint-table-wrap"><table className="complaint-table"><thead><tr><th>Complaint</th><th>Priority</th><th>Status</th><th>Warden</th><th>Manage / History</th></tr></thead><tbody>
              {filteredComplaints.map((item) => <tr key={item.complaint_id}>
                <td><div className="issue-title">#{item.complaint_id} · {item.category_name}</div><div className="issue-subtitle complaint-description" title={item.description}>{item.description}</div><div className="complaint-meta">{item.student_name} · {new Date(item.date_reported).toLocaleString()}</div>{item.warden_name ? <div className="complaint-assignee">Warden: {item.warden_name}</div> : <div className="complaint-assignee unassigned">Not assigned</div>}</td>
                <td><span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                <td><span className={`status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span></td>
                <td>{role === "ADMIN" ? <><select aria-label={`Assign warden for complaint ${item.complaint_id}`} className="complaint-status-select" value={item.warden_id === null ? "" : String(item.warden_id)} disabled={savingAssignmentId === item.complaint_id} onChange={(event) => void assignComplaintWarden(item, event.target.value)}><option value="">Unassigned</option>{wardens.map((warden) => <option key={warden.warden_id} value={warden.warden_id}>{warden.name}</option>)}</select>{savingAssignmentId === item.complaint_id && <small className="saving-status">Saving…</small>}</> : role === "WARDEN" ? (item.warden_id === user.wardenId ? <span className="complaint-assignee">Assigned to you</span> : item.warden_id === null ? <button type="button" className="small-action" disabled={savingAssignmentId === item.complaint_id} onClick={() => void assignComplaintWarden(item, String(user.wardenId))}>{savingAssignmentId === item.complaint_id ? "Saving…" : "Assign to me"}</button> : <span className="complaint-assignee">Another warden</span>) : <span className="complaint-assignee">Hostel team</span>}</td>
                <td>{role === "ADMIN" || (role === "WARDEN" && item.warden_id === user.wardenId) ? <><select aria-label={`Update status for complaint ${item.complaint_id}`} className="complaint-status-select" value={item.status} disabled={savingStatusId === item.complaint_id} onChange={(event) => void updateComplaintStatus(item, event.target.value as ComplaintRow["status"])}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></select>{savingStatusId === item.complaint_id && <small className="saving-status">Saving…</small>}</> : <span className={`status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span>}<div><button type="button" className="small-action" onClick={() => void viewHistory(item)}>{historyFor === item.complaint_id ? "Hide history" : "History"}</button></div></td>
              </tr>)}
            </tbody></table></div>
          ) : <div className="empty-state">{complaints.length ? "No complaints match these filters." : "No complaints found. Submit a complaint or load the sample seed data."}</div>}
          <div className="complaint-list-footer"><span>Showing {filteredComplaints.length} of {complaints.length} complaints</span><span>Statuses are saved to PostgreSQL</span></div>
          {historyFor !== null && <div className="history-panel"><div className="card-heading"><div><h2>Complaint #{historyFor} activity history</h2><p>Retrieved from MongoDB complaint_events</p></div></div>{historyLoading ? <div className="empty-state">Loading activity…</div> : historyError ? <div className="empty-state">{historyError}</div> : historyEvents.length ? <ul className="history-list">{historyEvents.map((event, index) => <li key={`${event.createdAt}-${event.action}-${index}`}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actor} · {new Date(event.createdAt).toLocaleString()}</span>{event.oldStatus && event.newStatus && <small>{event.oldStatus} → {event.newStatus}</small>}{event.note && <p>{event.note}</p>}</li>)}</ul> : <div className="empty-state">No history event was found for this complaint.</div>}</div>}
        </section>
      </div>
      <div className="allocation-process-note"><strong>Complaint workflow:</strong> student submits issue → warden reviews it → status moves to In Progress → Resolved or Rejected. Each status update is stored in PostgreSQL; an activity event is also sent to MongoDB.</div>
    </div>
  );
}
