import { serve } from '@hono/node-server';
import server from './dist/server/server.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const dbFile = "sqlite.db";
console.log(`Initializing database ${dbFile}...`);
const sqlite = new Database(dbFile);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  member_since TEXT NOT NULL,
  profile_complete INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
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
  user_id TEXT,
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
  user_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  file_path TEXT
);
`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

const mimeTypes = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

console.log(`Starting server on port ${port}...`);

serve({
  port: Number(port),
  hostname: '0.0.0.0',
  fetch: async (req) => {
    const url = new URL(req.url);
    const filePath = path.join(__dirname, 'dist', 'client', url.pathname);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'text/plain';
      const fileBuffer = fs.readFileSync(filePath);
      return new Response(fileBuffer, {
        headers: { 'Content-Type': contentType },
      });
    }

    return server.fetch(req);
  },
});
