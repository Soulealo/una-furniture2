ALTER TABLE users ADD COLUMN googleId TEXT;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
ON users (googleId)
WHERE googleId IS NOT NULL AND googleId <> '';

CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);
