import { Pool } from 'pg'

// DATABASE_URL is a standard Postgres connection string:
//   postgres://user:password@host:port/dbname
// This is the same format Railway provides for Postgres plugins.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Reasonable pool sizing for a lightweight service
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Railway Postgres requires SSL in production; allow self-signed certs
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err)
})

export default pool
