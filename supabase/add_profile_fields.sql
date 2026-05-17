-- Add bio and tagline columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Set default values for existing users (optional)
UPDATE users SET tagline = 'Civic Tech Explorer & Community Guardian' WHERE tagline IS NULL;
UPDATE users SET bio = 'Hi there, I am a dedicated citizen reporter helping to keep our city clean.' WHERE bio IS NULL;
