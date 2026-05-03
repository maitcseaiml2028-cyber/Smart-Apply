import { db } from "./index";
import { users, applications, documents, profiles } from "./schema";

async function seed() {
  console.log("Purging database data for privacy...");

  // Delete all existing applications, documents, and profiles
  await db.delete(applications);
  await db.delete(documents);
  await db.delete(profiles);
  await db.delete(users);

  console.log("Seeding fresh database...");

  // Insert user
  await db.insert(users).values({
    id: "user_1",
    fullName: "Demo",
    email: process.env.DEMO_EMAIL || "demo@gmail.com",
    password: process.env.DEMO_PASSWORD || "Demo123",
    memberSince: "Jan 2026",
    profileComplete: 0,
  }).onConflictDoNothing();

  // Insert Personal Use Account
  await db.insert(users).values({
    id: "user_shivanand",
    fullName: "Shivanand Ray",
    email: process.env.PERSONAL_EMAIL || "shivanandray5242@gmail.com",
    password: process.env.PERSONAL_PASSWORD || "Ray@2005",
    memberSince: "May 2026",
    profileComplete: 0,
  }).onConflictDoNothing();

  console.log("Seeding complete!");
}

seed().catch(console.error);
