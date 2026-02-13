ALTER TABLE analytics ADD COLUMN IF NOT EXISTS ip String AFTER code;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS user_agent String AFTER ip;
