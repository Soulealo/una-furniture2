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

CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_name
ON product_color_variants (product_id, name);
