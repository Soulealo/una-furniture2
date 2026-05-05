PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN imageUrls TEXT;
ALTER TABLE products ADD COLUMN sizes TEXT;
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    fullname TEXT,
    email TEXT UNIQUE,
    passwordHash TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderCode TEXT UNIQUE,
    userId INTEGER,
    items TEXT,
    totalAmount INTEGER DEFAULT 0,
    paymentMethod TEXT,
    transactionCode TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_settings (
    id INTEGER PRIMARY KEY,
    bankName TEXT,
    accountNumber TEXT,
    accountHolder TEXT,
    facebookChatUrl TEXT,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    passwordHash TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO categories (name, createdAt, updatedAt)
VALUES ('Uncategorized', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO payment_settings (id, bankName, accountNumber, accountHolder, facebookChatUrl, updatedAt)
VALUES (1, 'Khan Bank', '', 'UNA Home & Furniture', '', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO admin_settings (id, username, email, passwordHash, createdAt, updatedAt)
VALUES (1, 'admin', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
