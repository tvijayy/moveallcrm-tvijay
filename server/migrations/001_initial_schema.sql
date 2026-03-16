
-- ==============================================
-- MoveHome CRM - Updated Schema (matching frontend mock data)
-- ==============================================

-- Drop old tables if they exist
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS storage_masterlist CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==============================================
-- USERS
-- ==============================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(50),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- LEADS
-- ==============================================
CREATE TABLE leads (
    id              SERIAL PRIMARY KEY,
    customer_name   VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    move_date       DATE,
    status          VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
    extra_request   TEXT,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- JOBS
-- ==============================================
CREATE TABLE jobs (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    team            VARCHAR(100),
    contractor      VARCHAR(255),
    extras          TEXT,
    deposit         NUMERIC(10,2) DEFAULT 0,
    invoice         VARCHAR(50),
    move_out        TEXT,
    second_stop     TEXT,
    move_in         TEXT,
    on_way_sms      VARCHAR(20) DEFAULT 'not_sent' CHECK (on_way_sms IN ('sent', 'not_sent')),
    last_sms        VARCHAR(20) DEFAULT 'not_sent' CHECK (last_sms IN ('sent', 'not_sent')),
    time_sheet      VARCHAR(50),
    move_date       DATE,
    brand           VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'archived')),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- STORAGE MASTERLIST
-- ==============================================
CREATE TABLE storage_masterlist (
    id                  SERIAL PRIMARY KEY,
    storage_location    VARCHAR(255),
    move_in_date        DATE,
    unit_numbers        VARCHAR(100),
    padlock_code        VARCHAR(20),
    client_name         VARCHAR(255) NOT NULL,
    mobile              VARCHAR(50),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    repeated_invoice    VARCHAR(50),
    stripe_sub          VARCHAR(100),
    sell_price          NUMERIC(10,2) DEFAULT 0,
    buy_price           NUMERIC(10,2) DEFAULT 0,
    margin              NUMERIC(10,2) DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- CONTACTS (Client Dictionary)
-- ==============================================
CREATE TABLE contacts (
    id              SERIAL PRIMARY KEY,
    client_name     VARCHAR(255) NOT NULL,
    address         TEXT,
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    email           VARCHAR(255),
    mobile          VARCHAR(50),
    category        VARCHAR(30) DEFAULT 'residential' CHECK (category IN ('residential', 'corporate', 'commercial')),
    related_jobs    TEXT,
    last_move_date  DATE,
    last_move_in    TEXT,
    last_team       VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- CONTRACTORS (Contractor Dictionary)
-- ==============================================
CREATE TABLE contractors (
    id              SERIAL PRIMARY KEY,
    company         VARCHAR(255) NOT NULL,
    category        VARCHAR(30) DEFAULT 'driver' CHECK (category IN ('subcontractor', 'driver', 'mover')),
    tag             VARCHAR(50),
    rates           VARCHAR(50),
    trucks          VARCHAR(255),
    first_name      VARCHAR(255),
    last_name       VARCHAR(255),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    linkedin        TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- ACTIVITY LOGS
-- ==============================================
CREATE TABLE activity_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    details     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- INDEXES
-- ==============================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_move_date ON leads(move_date);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_move_date ON jobs(move_date);
CREATE INDEX idx_jobs_team ON jobs(team);
CREATE INDEX idx_storage_status ON storage_masterlist(status);
CREATE INDEX idx_contacts_category ON contacts(category);
CREATE INDEX idx_contractors_category ON contractors(category);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
