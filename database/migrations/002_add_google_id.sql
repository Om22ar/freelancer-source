-- Add Google OAuth ID to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;

-- Allow password_hash to be NULL for OAuth-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for faster OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id);
