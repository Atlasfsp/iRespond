CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id text PRIMARY KEY,
  in_app boolean NOT NULL DEFAULT true,
  push boolean NOT NULL DEFAULT true,
  sms boolean NOT NULL DEFAULT false,
  email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  resource_type text,
  resource_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_unread_idx ON user_notifications(user_id, created_at DESC) WHERE read_at IS NULL;
