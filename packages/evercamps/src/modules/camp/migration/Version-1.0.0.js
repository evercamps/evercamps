import { execute } from "@evershop/postgres-query-builder";

export default async function (connection) {
  await execute(
    connection,
    `CREATE TABLE participant (
      "participant_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await execute(
    connection,
    `CREATE TABLE registration (
      registration_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      registration_participant_id INT NOT NULL,
      registration_product_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_registration_participant FOREIGN KEY (registration_participant_id) REFERENCES participant(participant_id) ON DELETE CASCADE,
      CONSTRAINT fk_registration_product FOREIGN KEY (registration_product_id) REFERENCES product(product_id) ON DELETE CASCADE
    )`
  );
}