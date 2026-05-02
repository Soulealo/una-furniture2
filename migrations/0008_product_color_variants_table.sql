PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS product_color_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color_value TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_order
ON product_color_variants (product_id, sort_order, id);

INSERT INTO product_color_variants (product_id, name, color_value, image, sort_order, created_at, updated_at)
SELECT
    p.id,
    TRIM(COALESCE(json_extract(variant.value, '$.name'), '')),
    TRIM(COALESCE(
        json_extract(variant.value, '$.colorValue'),
        json_extract(variant.value, '$.color_value'),
        json_extract(variant.value, '$.color'),
        json_extract(variant.value, '$.value'),
        ''
    )),
    TRIM(COALESCE(
        json_extract(variant.value, '$.image'),
        json_extract(variant.value, '$.imageUrl'),
        ''
    )),
    CAST(variant.key AS INTEGER),
    COALESCE(p.createdAt, CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM products p,
     json_each(CASE WHEN json_valid(p.colorVariants) THEN p.colorVariants ELSE '[]' END) AS variant
WHERE NOT EXISTS (
      SELECT 1
      FROM product_color_variants existing
      WHERE existing.product_id = p.id
  )
  AND (
      TRIM(COALESCE(json_extract(variant.value, '$.name'), '')) <> ''
      OR TRIM(COALESCE(json_extract(variant.value, '$.image'), json_extract(variant.value, '$.imageUrl'), '')) <> ''
  );
