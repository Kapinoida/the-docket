const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load .env.local for local dev (dotenv is devDep, won't exist in prod image)
try { require('dotenv').config({ path: '.env.local' }); } catch {}

// Same connection pattern as src/lib/db.ts — individual env vars with defaults
// that work for both local dev (localhost:5433) and Docker prod (postgres:5432)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'the_docket',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Same regex node-pg-migrate uses to split Up/Down sections
function createMigrationCommentRegex(direction) {
  return new RegExp(`^\\s*--[\\s-]*${direction}\\s+migration`, 'im');
}

function parseSqlMigration(content) {
  const upRegex = createMigrationCommentRegex('up');
  const downRegex = createMigrationCommentRegex('down');
  const upStart = content.search(upRegex);
  const downStart = content.search(downRegex);

  let upSql;
  let downSql;

  if (upStart >= 0 && downStart >= 0) {
    if (upStart < downStart) {
      upSql = content.slice(upStart, downStart);
      downSql = content.slice(downStart);
    } else {
      upSql = content.slice(upStart);
      downSql = content.slice(downStart, upStart);
    }
  } else if (upStart >= 0) {
    upSql = content.slice(upStart);
  } else {
    // No -- Up migration comment — entire file is the "up" migration
    upSql = content;
  }

  return { up: upSql, down: downSql };
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create pgmigrations table if it doesn't exist (same schema as node-pg-migrate)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id SERIAL PRIMARY KEY,
        name varchar(255) NOT NULL,
        run_on timestamp NOT NULL
      );
    `);

    // Get list of already-applied migrations
    const applied = await client.query(
      'SELECT name FROM pgmigrations ORDER BY run_on, id'
    );
    const appliedNames = new Set(applied.rows.map((r) => r.name));

    // Read migration files from src/migrations/
    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Nothing to do.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found. Nothing to do.');
      return;
    }

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      // Migration name is filename without extension (matches node-pg-migrate convention)
      const name = file.replace(/\.sql$/, '');

      if (appliedNames.has(name)) {
        console.log(`  [skip] ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`  [apply] ${file}`);
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const { up } = parseSqlMigration(content);

      await client.query('BEGIN');
      try {
        await client.query(up);
        await client.query(
          'INSERT INTO pgmigrations (name, run_on) VALUES ($1, NOW())',
          [name]
        );
        await client.query('COMMIT');
        console.log(`  [done] ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [FAILED] ${file}:`, err.message);
        throw err;
      }
    }

    console.log(
      `\nMigrations complete. Applied: ${appliedCount}, Skipped: ${skippedCount}.`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});