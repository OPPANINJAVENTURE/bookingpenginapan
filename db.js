const { Pool } = require("pg");

const ssl =
  process.env.PGSSL === "true"
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
