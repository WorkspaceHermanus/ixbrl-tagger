CREATE EXTENSION IF NOT EXISTS citext;

-- Tenant boundary (org/workspace). One per signup for MVP; supports teams later without a rewrite.
CREATE TABLE accounts (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login identity — global, not per-account, so one user can later join multiple accounts.
CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  email          CITEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table (not a users.account_id column) so a user can later belong to more than one account.
CREATE TABLE account_members (
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);

-- Opaque, revocable sessions (not stateless JWT) so logout/revoke-all is a single DELETE.
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Maps 1:1 onto the existing mcg_companies array shape. tags/rows kept as JSONB blobs,
-- matching how the frontend already reads/writes them wholesale.
CREATE TABLE companies (
  id           TEXT PRIMARY KEY,
  account_id   BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  reg_number   TEXT,
  year_end     TEXT,
  framework    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  tag_count    INTEGER NOT NULL DEFAULT 0,
  session      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_companies_account ON companies(account_id);
