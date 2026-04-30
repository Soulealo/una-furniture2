PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    url TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_position
ON product_images (productId, position, id);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId INTEGER NOT NULL,
    productId INTEGER,
    productCode TEXT,
    productName TEXT NOT NULL,
    productPrice INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    imageUrl TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items (orderId);

CREATE INDEX IF NOT EXISTS idx_orders_user_created
ON orders (userId, createdAt);

CREATE INDEX IF NOT EXISTS idx_orders_code
ON orders (orderCode);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products (category);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users (email);

INSERT INTO product_images (productId, url, position, createdAt)
SELECT p.id, json_each.value, CAST(json_each.key AS INTEGER), COALESCE(p.createdAt, datetime('now'))
FROM products p, json_each(CASE WHEN json_valid(p.imageUrls) THEN p.imageUrls ELSE '[]' END)
WHERE json_valid(p.imageUrls)
  AND TRIM(json_each.value) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM product_images pi
      WHERE pi.productId = p.id
        AND pi.url = json_each.value
  );

INSERT INTO product_images (productId, url, position, createdAt)
SELECT p.id, p.imageUrl, 0, COALESCE(p.createdAt, datetime('now'))
FROM products p
WHERE p.imageUrl IS NOT NULL
  AND TRIM(p.imageUrl) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM product_images pi
      WHERE pi.productId = p.id
  );
