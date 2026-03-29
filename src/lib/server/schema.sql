CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  state_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  friend_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  privacy TEXT NOT NULL DEFAULT 'private',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_members (
  room_code TEXT NOT NULL REFERENCES rooms(code),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (room_code, user_id)
);

CREATE TABLE IF NOT EXISTS room_invitations (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(code),
  inviter_id TEXT NOT NULL REFERENCES users(id),
  invitee_id TEXT NOT NULL REFERENCES users(id),
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(room_code, invitee_id)
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  client_session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  room_code TEXT NOT NULL,
  room_kind TEXT NOT NULL,
  focus_duration_seconds INTEGER NOT NULL,
  break_duration_seconds INTEGER NOT NULL DEFAULT 300,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_room_status ON room_invitations(room_code, status);
CREATE INDEX IF NOT EXISTS idx_room_invitations_invitee_status ON room_invitations(invitee_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_invitations_invite_code
  ON room_invitations(invite_code)
  WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_completed
  ON pomodoro_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_room
  ON pomodoro_sessions(room_code, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user
  ON achievement_unlocks(user_id, unlocked_at DESC);
