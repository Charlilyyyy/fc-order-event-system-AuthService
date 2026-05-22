-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
CREATE TYPE credential_type AS ENUM ('password', 'passkey', 'oauth', 'saml', 'ldap');
CREATE TYPE mfa_type AS ENUM ('totp', 'sms', 'email', 'webauthn');
CREATE TYPE token_purpose AS ENUM ('email_verify', 'password_reset', 'magic_link', 'invite');
CREATE TYPE audit_action AS ENUM (
  'login_success', 'login_failure', 'logout', 'password_change',
  'mfa_enroll', 'mfa_verify', 'token_refresh', 'account_locked',
  'email_verified', 'oauth_linked', 'role_assigned', 'session_revoked'
);

-- =============================================================================
-- 1. CORE IDENTITY
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT NOT NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  phone           TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  status          user_status NOT NULL DEFAULT 'pending',
  password_changed_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   INET,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  locale          TEXT DEFAULT 'en',
  timezone        TEXT DEFAULT 'UTC',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,  -- soft delete

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE user_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name    TEXT,
  first_name      TEXT,
  last_name       TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  date_of_birth   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. CREDENTIALS (password, OAuth, passkeys — separate from user row)
-- =============================================================================

CREATE TABLE credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            credential_type NOT NULL,
  identifier      TEXT,           -- provider subject, passkey credential id
  secret_hash     TEXT,           -- bcrypt/argon2 for password; NULL for OAuth
  public_key      TEXT,           -- WebAuthn public key (JSON)
  provider        TEXT,           -- 'google', 'github', 'local'
  sign_count      BIGINT,         -- WebAuthn counter
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT credentials_user_type_identifier UNIQUE (user_id, type, identifier)
);

CREATE INDEX idx_credentials_user_id ON credentials(user_id);

-- OAuth / social account linking (Auth0-style "identities")
CREATE TABLE identities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,   -- google, apple, github
  provider_user_id TEXT NOT NULL, -- sub from IdP
  email           CITEXT,
  access_token_encrypted BYTEA,    -- encrypted at rest
  refresh_token_encrypted BYTEA,
  token_expires_at TIMESTAMPTZ,
  profile_data    JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT identities_provider_subject UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_identities_user_id ON identities(user_id);

-- =============================================================================
-- 3. ONE-TIME TOKENS (verify email, reset password, magic link, invites)
-- =============================================================================

CREATE TABLE verification_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  email           CITEXT,           -- for pre-registration verify
  purpose         token_purpose NOT NULL,
  token_hash      TEXT NOT NULL,  -- store hash only, never raw token
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT verification_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX idx_verification_tokens_user_purpose
  ON verification_tokens(user_id, purpose) WHERE consumed_at IS NULL;

-- =============================================================================
-- 4. SESSIONS & REFRESH TOKENS (rotation + reuse detection)
-- =============================================================================

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,  -- httpOnly cookie value (hashed)
  user_agent      TEXT,
  ip_address      INET,
  device_label    TEXT,
  is_remember_me  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_active
  ON sessions(user_id) WHERE revoked_at IS NULL AND expires_at > NOW();

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  family_id       UUID NOT NULL,  -- rotation family for reuse detection
  replaced_by_id  UUID REFERENCES refresh_tokens(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);

-- JWT denylist (when you can't revoke all sessions instantly)
CREATE TABLE revoked_tokens (
  jti             TEXT PRIMARY KEY,  -- JWT ID claim
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- Machine / API access (service accounts, PATs)
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_prefix      TEXT NOT NULL,   -- first 8 chars for lookup
  key_hash        TEXT NOT NULL UNIQUE,
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;

-- =============================================================================
-- 5. MFA
-- =============================================================================

CREATE TABLE mfa_factors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            mfa_type NOT NULL,
  name            TEXT,            -- "Authenticator app", "YubiKey"
  secret_encrypted BYTEA,         -- TOTP secret, encrypted
  credential_id   TEXT,           -- WebAuthn credential id
  public_key      TEXT,
  sign_count      BIGINT,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mfa_factors_user_type_name UNIQUE (user_id, type, name)
);

CREATE TABLE mfa_backup_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash       TEXT NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. AUTHORIZATION (RBAC + multi-tenant)
-- =============================================================================

CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',  -- owner, admin, member
  invited_by      UUID REFERENCES users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT org_members_unique UNIQUE (organization_id, user_id)
);

CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,  -- admin, user, billing_manager
  description     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource        TEXT NOT NULL,   -- orders, users, billing
  action          TEXT NOT NULL,   -- read, write, delete
  description     TEXT,

  CONSTRAINT permissions_resource_action UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by      UUID REFERENCES users(id),
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, role_id, organization_id)
);

-- Optional: fine-grained overrides
CREATE TABLE user_permissions (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted         BOOLEAN NOT NULL DEFAULT TRUE,  -- true=grant, false=deny
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id, organization_id)
);

-- =============================================================================
-- 7. INVITATIONS & ACCOUNT LIFECYCLE
-- =============================================================================

CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email           CITEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  token_hash      TEXT NOT NULL UNIQUE,
  invited_by      UUID NOT NULL REFERENCES users(id),
  accepted_by     UUID REFERENCES users(id),
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE account_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_for   TIMESTAMPTZ NOT NULL,  -- grace period (e.g. +30 days)
  reason          TEXT,
  cancelled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type    TEXT NOT NULL,   -- terms, privacy, marketing
  version         TEXT NOT NULL,
  granted         BOOLEAN NOT NULL,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. SECURITY, AUDIT, RATE LIMITING SUPPORT
-- =============================================================================

CREATE TABLE auth_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  action          audit_action NOT NULL,
  success         BOOLEAN NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_events_user_created ON auth_events(user_id, created_at DESC);
CREATE INDEX idx_auth_events_ip_created ON auth_events(ip_address, created_at DESC);

CREATE TABLE trusted_devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  label           TEXT,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trusted_devices_unique UNIQUE (user_id, device_fingerprint)
);

-- Login attempt tracking (brute-force protection)
CREATE TABLE login_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier      CITEXT NOT NULL,  -- email or username tried
  ip_address      INET,
  success         BOOLEAN NOT NULL,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_identifier_created
  ON login_attempts(identifier, created_at DESC);

-- =============================================================================
-- 9. OPTIONAL: EXTERNAL APP REGISTRY (OAuth clients you own)
-- =============================================================================

CREATE TABLE oauth_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT,
  name            TEXT NOT NULL,
  redirect_uris   TEXT[] NOT NULL,
  grant_types     TEXT[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  is_confidential BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_authorization_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash       TEXT NOT NULL UNIQUE,
  redirect_uri    TEXT NOT NULL,
  scopes          TEXT[] NOT NULL,
  code_challenge  TEXT,            -- PKCE
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);