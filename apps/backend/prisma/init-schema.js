'use strict';
/**
 * init-schema.js — idempotent database schema initialisation.
 *
 * Bypasses the Prisma CLI (which requires advisory locks / direct connections)
 * and instead uses PrismaClient.$executeRawUnsafe() to run each DDL statement.
 * This works through Supabase's pgBouncer transaction-mode pooler (port 6543)
 * when DATABASE_URL already includes ?pgbouncer=true, or the URL is patched here.
 *
 * Every CREATE TYPE, CREATE TABLE, CREATE UNIQUE INDEX, and ALTER TABLE is
 * wrapped so that "already exists" errors are silently skipped, making the
 * script fully idempotent.
 *
 * Run: node prisma/init-schema.js
 * Exit code is always 0 — a schema error should never block the app from
 * starting (tables may already exist from a prior deploy).
 */

const path = require('path');
const fs   = require('fs');

function buildUrl() {
  const url = process.env.DATABASE_URL || '';
  if (url.includes(':6543/') && !url.includes('pgbouncer=true')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}pgbouncer=true&connection_limit=1&connect_timeout=5`;
  }
  return url;
}

function splitStatements(sql) {
  return sql
    .replace(/--[^\n]*/g, '')   // strip line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function run() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: buildUrl() } } });

  try {
    // Quick existence check — skip everything if the vehicles table already exists.
    const [{ exists }] = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_tables
        WHERE schemaname = 'public' AND tablename = 'vehicles'
      ) AS "exists"
    `;
    if (exists) {
      console.log('[init-schema] vehicles table already exists — skipping');
      return;
    }

    console.log('[init-schema] initialising database schema …');

    const migrations = [
      path.join(__dirname, 'migrations', '0001_init', 'migration.sql'),
      path.join(__dirname, 'migrations', '0002_add_foreign_key_indexes', 'migration.sql'),
    ];

    for (const file of migrations) {
      const sql = fs.readFileSync(file, 'utf8');
      const statements = splitStatements(sql);
      let applied = 0;

      for (const stmt of statements) {
        try {
          await prisma.$executeRawUnsafe(stmt);
          applied++;
        } catch (err) {
          const msg = (err.message || '').toLowerCase();
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate') ||
            msg.includes('42p07') ||  // duplicate_table
            msg.includes('42710')     // duplicate_object (type/constraint)
          ) {
            // idempotent — object exists from a prior run, continue
          } else {
            console.error(`[init-schema] unexpected error on statement:\n  ${stmt.substring(0, 120)}\n  ${err.message}`);
            throw err;
          }
        }
      }

      console.log(`[init-schema] ${path.basename(path.dirname(file))} — ${applied} statements applied`);
    }

    console.log('[init-schema] schema ready');
  } catch (err) {
    console.error('[init-schema] failed:', err.message);
    // Do NOT re-throw — let node dist/main start regardless
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error('[init-schema] fatal:', err.message);
  process.exit(0); // always exit 0 so the startCommand continues
});
