import { execute } from "@evershop/postgres-query-builder";

export default async function (connection) {
  await execute(
    connection,
    `CREATE TABLE participant (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
}