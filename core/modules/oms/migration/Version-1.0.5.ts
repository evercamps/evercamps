import { execute } from '@evershop/postgres-query-builder';

export default async (connection: any) => {
  // INVENTORY_RESERVATION: seat holds against a catalog inventory_item, tied to an order.
  // Lives in oms (not catalog) because it FKs to checkout's "order" table, which only
  // exists once checkout has migrated; oms loads after both catalog and checkout.
  await execute(
    connection,
    `CREATE TABLE "inventory_reservation" (
  "inventory_reservation_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "inventory_item_id" INT NOT NULL,
  "order_id" INT NOT NULL,
  "seats_held" INT NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "INVENTORY_RESERVATION_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "UNSIGNED_SEATS_HELD" CHECK(seats_held > 0),
  CONSTRAINT "FK_INVENTORY_RESERVATION_ITEM" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item" ("inventory_item_id") ON DELETE CASCADE,
  CONSTRAINT "FK_INVENTORY_RESERVATION_ORDER" FOREIGN KEY ("order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_INVENTORY_RESERVATION_ITEM" ON "inventory_reservation" ("inventory_item_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_INVENTORY_RESERVATION_ORDER" ON "inventory_reservation" ("order_id")`
  );
};
