import { execute } from '@evershop/postgres-query-builder';

// Repurposes the previously-dead product.type column (always 'simple' by
// default, never read/written anywhere) to distinguish camp/registration
// products from regular ones, replacing the manage_registrations boolean.
// manage_registrations defaults TRUE (Version-1.0.8.js), so the backfill
// must read each row's actual value rather than relying on type's own
// DEFAULT 'simple' - most existing products are registrations, not simple.
// manage_registrations itself is left in place, unused, for this phase -
// dropping it is a separate, later migration once nothing reads it directly.
export default async (connection) => {
  await execute(
    connection,
    `UPDATE product SET type = CASE WHEN manage_registrations THEN 'camp' ELSE 'simple' END`
  );
};
