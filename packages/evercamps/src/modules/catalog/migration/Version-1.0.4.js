import { execute, insert, select, update } from '@evershop/postgres-query-builder';
import { debug, error } from '../../../lib/log/logger.js';

export default async (connection) => {
  // Create a function to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_inventory_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('inventory_updated', json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON "product_inventory"
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_inventory_updated_event();`
  );

  // Check if a default collection called "Featured Products" already exists
  const featuredProductsExists = await execute(
    connection,
    `SELECT EXISTS (SELECT 1 FROM collection WHERE code = 'homepage');`
  );

  if (featuredProductsExists.rows[0].exists) {
    return;
  }

  // Create a default collection called "Featured Products"
  const featuredProducts = await insert('collection')
    .given({
      name: 'Featured camps',
      code: 'homepage'
    })
    .execute(connection);

  // Create 4 default products and assign them to the "Featured Products" collection
  const product1 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'FMD-12345',
      price: 100,
      weight: 100,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product1.insertId,
      qty: 100,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description').given({
    product_description_product_id: product1.insertId,
    name: 'Soccer Camp',
    url_key: 'soccer-camp',
    meta_title: 'Soccer camp - Have fun',
    meta_description: 'Soccer Camp',
    meta_keywords: 'Soccer Camp',
    description: 'Sharpen your footwork, boost your teamwork, and score unforgettable goals in our dynamic Soccer Camp. Participants will learn essential techniques, enjoy fun drills, and experience thrilling scrimmages designed for every skill level. Whether you\'re a beginner or a rising star, this camp promises nonstop action and camaraderie.'
  }).execute(connection);

  const product2 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'CLL-98765',
      price: 120,
      weight: 120,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product2.insertId,
      qty: 120,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description').given({
    product_description_product_id: product2.insertId,
    name: 'Surf Camp',
    url_key: 'surf-camp',
    meta_title: 'Surf camp - Ride the waves',
    meta_description: 'Surf Camp',
    meta_keywords: 'Surf Camp',
    description: 'Dive into adventure at our Surf Camp! From first-time paddlers to budding pros, campers learn to ride waves while absorbing essential water safety and ocean awareness. Enjoy sun-soaked days, expert coaching, and the pure joy of catching that perfect break.'
  }).execute(connection);

  const product3 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'DSJ-54321',
      price: 120,
      weight: 120,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product3.insertId,
      qty: 90,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description').given({
    product_description_product_id: product3.insertId,
    name: 'Dance Camp',
    url_key: 'dance-camp',
    meta_title: 'Dance camp - Move with style',
    meta_description: 'Dance Camp',
    meta_keywords: 'Dance Camp',
    description: 'Express yourself through movement at our vibrant Dance Camp. Explore styles from hip-hop to ballet, enhance your rhythm and coordination, and build confidence through energetic workshops and performances. It’s a celebration of music, movement, and self-expression.'
  }).execute(connection);

  const product4 = await insert('product')
    .given({
      type: 'simple',
      visibility: 1,
      group_id: 1,
      sku: 'SCS-24680',
      price: 90,
      weight: 90,
      status: true,
      variant_group_id: null
    })
    .execute(connection);

  await insert('product_inventory')
    .given({
      product_inventory_product_id: product4.insertId,
      qty: 150,
      manage_stock: true,
      stock_availability: true
    })
    .execute(connection);

  await insert('product_description').given({
    product_description_product_id: product4.insertId,
    name: 'Triathlon Camp',
    url_key: 'triathlon-camp',
    meta_title: 'Triathlon camp - Push your limits',
    meta_description: 'Triathlon Camp',
    meta_keywords: 'Triathlon Camp',
    description: 'Challenge your body and mind at our Triathlon Camp. Designed for aspiring athletes, this camp provides expert training in swimming, cycling, and running. Gain endurance, master transitions, and discover the thrill of pushing your limits in a supportive and motivational setting.'
  }).execute(connection);

  // Assign products to the "Featured Camps" collection
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product1.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product2.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product3.insertId
    })
    .execute(connection);
  await insert('product_collection')
    .given({
      collection_id: featuredProducts.insertId,
      product_id: product4.insertId
    })
    .execute(connection);

  // assign products to category
  const query = select('category_id').from('category');
  const result = await query.execute(connection);
  const ids = result.map(r => r.category_id);

  await update("product")
    .given({ category_id: ids[Math.floor(Math.random() * ids.length)] })
    .where("product_id", "=", product1.insertId)
    .execute(connection);

  await update("product")
    .given({ category_id: ids[Math.floor(Math.random() * ids.length)] })
    .where("product_id", "=", product2.insertId)
    .execute(connection);

  await update("product")
    .given({ category_id: ids[Math.floor(Math.random() * ids.length)] })
    .where("product_id", "=", product3.insertId)
    .execute(connection);

  await update("product")
    .given({ category_id: ids[Math.floor(Math.random() * ids.length)] })
    .where("product_id", "=", product4.insertId)
    .execute(connection);
};
