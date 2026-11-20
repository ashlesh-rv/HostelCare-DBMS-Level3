import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var hostelMongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var hostelMongoIndexesPromise: Promise<void> | undefined;
}

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing. Set it in .env.local to enable complaint activity history.");
  if (!global.hostelMongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    global.hostelMongoClientPromise = client.connect();
  }
  const client = await global.hostelMongoClientPromise;
  const db = client.db(process.env.MONGODB_DB || "hostel_system");
  if (!global.hostelMongoIndexesPromise) {
    global.hostelMongoIndexesPromise = Promise.all([
      db.collection("complaint_events").createIndex({ complaintId: 1, createdAt: -1 }),
      db.collection("complaint_events").createIndex({ action: 1, createdAt: -1 }),
    ]).then(() => undefined);
  }
  await global.hostelMongoIndexesPromise;
  return db;
}

export async function logComplaintEvent(event: {
  complaintId: number;
  action: string;
  actor: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  note?: string;
}) {
  const db = await getMongoDb();
  await db.collection("complaint_events").insertOne({ ...event, createdAt: new Date() });
}

export async function getComplaintEventSummary() {
  const db = await getMongoDb();
  return db.collection("complaint_events").aggregate([
    { $group: { _id: "$action", eventCount: { $sum: 1 }, lastEventAt: { $max: "$createdAt" } } },
    { $sort: { eventCount: -1, _id: 1 } },
  ]).toArray();
}
