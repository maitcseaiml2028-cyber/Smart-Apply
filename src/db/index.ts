import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let _db: any = null;

export const getDb = (env?: any) => {
  if (_db) return _db;

  // If we are in a Cloudflare environment with a D1 binding
  if (env?.DB) {
    _db = drizzleD1(env.DB, { schema });
    return _db;
  }

  // Fallback to local SQLite for development (Dynamic imports for Node-only libs)
  const Database = require("better-sqlite3");
  const { drizzle: drizzleSqlite } = require("drizzle-orm/better-sqlite3");

  const sqlite = new Database("sqlite.db");
  _db = drizzleSqlite(sqlite, { schema });

  try {
    _db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        member_since TEXT NOT NULL,
        profile_complete INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        dob TEXT,
        gender TEXT,
        phone TEXT,
        aadhaar_last_4 TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        country TEXT,
        qualification TEXT,
        institution TEXT,
        year_of_passing TEXT,
        cgpa TEXT
      );
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        link TEXT NOT NULL,
        apply_date TEXT,
        admit_date TEXT,
        exam_date TEXT,
        result_date TEXT,
        status TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        size TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        file_path TEXT
      );
    `);
  } catch (e) {
    // Ignore any db initialization errors
  }

  return _db;
};

export const db = getDb();
