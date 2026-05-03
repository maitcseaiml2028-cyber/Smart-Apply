import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  memberSince: text("member_since").notNull(),
  profileComplete: integer("profile_complete").default(0),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  dob: text("dob"),
  gender: text("gender"),
  phone: text("phone"),
  aadhaarLast4: text("aadhaar_last_4"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  country: text("country"),
  qualification: text("qualification"),
  institution: text("institution"),
  yearOfPassing: text("year_of_passing"),
  cgpa: text("cgpa"),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  link: text("link").notNull(),
  applyDate: text("apply_date"),
  admitDate: text("admit_date"),
  examDate: text("exam_date"),
  resultDate: text("result_date"),
  status: text("status").$type<"submitted" | "pending" | "approved" | "rejected" | "exam-scheduled" | "result-out">().notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: text("size").notNull(),
  verified: integer("verified").default(0), // Using integer for boolean fallback in SQLite
  filePath: text("file_path"),
});
