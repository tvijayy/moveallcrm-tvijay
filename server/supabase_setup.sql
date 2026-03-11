-- ==============================================
-- MoveHome CRM - Supabase Full Backend Setup
-- Paste this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fbcmldzculgqddmnepxw/sql/new
-- ==============================================

-- Enable pgcrypto for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================
-- DROP TABLES (clean slate)
-- ==============================================
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
    status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
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
-- CONTACTS
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
-- CONTRACTORS
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

-- ==============================================
-- RPC: verify_password (used by frontend login)
-- ==============================================
CREATE OR REPLACE FUNCTION verify_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_hash TEXT;
BEGIN
    SELECT password_hash INTO stored_hash FROM users WHERE email = p_email LIMIT 1;
    IF stored_hash IS NULL THEN RETURN FALSE; END IF;
    RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow the function to be called via REST API
GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================
-- ROW LEVEL SECURITY (open for service_role)
-- ==============================================
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_masterlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs      ENABLE ROW LEVEL SECURITY;

-- Allow all access via service_role key (used by frontend)
CREATE POLICY "service_role_all" ON users              FOR ALL USING (true);
CREATE POLICY "service_role_all" ON leads              FOR ALL USING (true);
CREATE POLICY "service_role_all" ON jobs               FOR ALL USING (true);
CREATE POLICY "service_role_all" ON storage_masterlist FOR ALL USING (true);
CREATE POLICY "service_role_all" ON contacts           FOR ALL USING (true);
CREATE POLICY "service_role_all" ON contractors        FOR ALL USING (true);
CREATE POLICY "service_role_all" ON activity_logs      FOR ALL USING (true);

-- ==============================================
-- SEED DATA
-- ==============================================

-- USERS
INSERT INTO users (name, phone, email, password_hash, role) VALUES
('Admin User',  '0400000001', 'admin@movehome.com',  crypt('admin123', gen_salt('bf', 10)), 'admin'),
('Jane Cooper', '0400000002', 'jane@movehome.com',   crypt('staff123', gen_salt('bf', 10)), 'staff'),
('Mike Ross',   '0400000003', 'mike@movehome.com',   crypt('staff123', gen_salt('bf', 10)), 'staff'),
('Rachel Zane', '0400000004', 'rachel@movehome.com', crypt('staff123', gen_salt('bf', 10)), 'staff')
ON CONFLICT (email) DO NOTHING;

-- LEADS
INSERT INTO leads (customer_name, phone, email, move_date, status, extra_request) VALUES
('John Smith',      '0412345678', 'john@email.com',      '2026-03-15', 'new',       'Piano moving'),
('Sarah Johnson',   '0423456789', 'sarah.j@gmail.com',   '2026-03-20', 'contacted', 'Packing materials needed'),
('Michael Chen',    '0434567890', 'mchen@outlook.com',   '2026-04-01', 'quoted',    NULL),
('Emma Wilson',     '0445678901', 'emma.w@company.com',  '2026-02-28', 'won',       'Fragile items – artwork'),
('David Brown',     '0456789012', 'dbrown@email.com',    '2026-03-05', 'lost',      'Storage needed'),
('Lisa Taylor',     '0467890123', 'lisa.t@gmail.com',    '2026-03-25', 'new',       NULL),
('James Anderson',  '0478901234', 'janderson@work.com',  '2026-04-10', 'contacted', 'Pool table'),
('Amy Martinez',    '0489012345', 'amy.m@email.com',     '2026-03-12', 'won',       'Pet transport');

-- JOBS
INSERT INTO jobs (first_name, last_name, phone, email, team, contractor, extras, deposit, invoice, move_out, second_stop, move_in, on_way_sms, last_sms, time_sheet, move_date, brand, status) VALUES
('John',    'Smith',   '0412345678', 'john@email.com',   'Team Alpha', 'FastMove Co', 'Piano',            500, 'INV-001', '15 King St, Sydney',       NULL,            '42 Pitt St, Melbourne',    'sent',     'sent',     '8am-4pm',  '2026-03-10', 'MoveHome Premium',  'scheduled'),
('Sarah',   'Johnson', '0423456789', 'sarah@email.com',  'Team Beta',  NULL,          'Packing, Fragile', 300, 'INV-002', '8 George St, Brisbane',    '101 Albert St', '55 Creek Rd, Gold Coast',  'not_sent', 'not_sent', '7am-3pm',  '2026-03-12', 'MoveHome Standard', 'scheduled'),
('Michael', 'Chen',    '0434567890', 'mchen@email.com',  'Team Alpha', 'ProHaul Ltd', NULL,                 0, 'INV-003', '22 Collins St, Melbourne', NULL,            '7 Flinders St, Melbourne', 'sent',     'sent',     '9am-5pm',  '2026-02-20', 'MoveHome Premium',  'completed'),
('Emma',    'Wilson',  '0445678901', 'emma@email.com',   'Team Gamma', NULL,          'Pool Table',       750, 'INV-004', '3 Queen St, Perth',        '88 Hay St',     '19 Murray St, Perth',      'not_sent', 'not_sent', '8am-6pm',  '2026-03-18', 'MoveHome Premium',  'scheduled'),
('David',   'Brown',   '0456789012', 'dbrown@email.com', 'Team Beta',  'QuickShift',  'Appliances',       200, 'INV-005', '10 North Tce, Adelaide',   NULL,            '45 Rundle Mall, Adelaide', 'sent',     'not_sent', '10am-4pm', '2026-01-15', 'MoveHome Standard', 'completed'),
('Lisa',    'Taylor',  '0467890123', 'lisa@email.com',   'Team Alpha', NULL,          NULL,               400, 'INV-006', '67 Elizabeth St, Hobart',  NULL,            '12 Davey St, Hobart',      'not_sent', 'not_sent', '8am-3pm',  '2026-03-22', 'MoveHome Standard', 'scheduled');

-- STORAGE
INSERT INTO storage_masterlist (storage_location, move_in_date, unit_numbers, padlock_code, client_name, mobile, email, phone, repeated_invoice, stripe_sub, sell_price, buy_price, margin, status) VALUES
('Warehouse A – Sydney',    '2026-01-15', 'A1, A2',      '4532', 'John Smith',    '0412345678', 'john@email.com',  '0298765432', 'Monthly',   'sub_abc123', 350.00, 200.00, 150.00, 'active'),
('Warehouse B – Melbourne', '2026-02-01', 'B5',          '7891', 'Sarah Johnson', '0423456789', 'sarah@email.com', '0312345678', 'Monthly',   'sub_def456', 280.00, 180.00, 100.00, 'active'),
('Warehouse A – Sydney',    '2025-06-10', 'A8, A9, A10', '2345', 'Michael Chen',  '0434567890', 'mchen@email.com', NULL,         'Quarterly', 'sub_ghi789', 750.00, 500.00, 250.00, 'archived'),
('Warehouse C – Brisbane',  '2026-02-20', 'C3',          '9012', 'Emma Wilson',   '0445678901', 'emma@email.com',  '0755551234', 'Monthly',   NULL,         200.00, 120.00,  80.00, 'active'),
('Warehouse B – Melbourne', '2025-03-01', 'B12',         '5678', 'David Brown',   '0456789012', 'dbrown@email.com','0399998888', 'Monthly',   'sub_jkl012', 300.00, 200.00, 100.00, 'archived');

-- CONTACTS
INSERT INTO contacts (client_name, address, first_name, last_name, email, mobile, category, related_jobs, last_move_date, last_move_in, last_team) VALUES
('Smith Household',     '15 King St, Sydney NSW 2000',      'John',    'Smith',   'john@email.com',    '0412345678', 'residential', 'JOB-001, JOB-005', '2026-02-15', '42 Pitt St, Melbourne',    'Team Alpha'),
('Johnson Corp',        '88 Collins St, Melbourne VIC 3000', 'Sarah',   'Johnson', 'sarah@company.com', '0423456789', 'corporate',   'JOB-002',          '2026-01-20', '55 Creek Rd, Gold Coast',  'Team Beta'),
('Chen Family',         '22 George St, Brisbane QLD 4000',  'Michael', 'Chen',    'mchen@email.com',   '0434567890', 'residential', 'JOB-003',          '2025-12-01', '7 Flinders St, Melbourne', 'Team Alpha'),
('Wilson & Associates', '3 Queen St, Perth WA 6000',        'Emma',    'Wilson',  'emma@wilson.com',   '0445678901', 'commercial',  'JOB-004, JOB-008', '2026-02-10', '19 Murray St, Perth',      'Team Gamma'),
('Brown Residence',     '10 North Tce, Adelaide SA 5000',   'David',   'Brown',   'dbrown@email.com',  '0456789012', 'residential', 'JOB-005',          '2025-11-15', '45 Rundle Mall, Adelaide', 'Team Beta');

-- CONTRACTORS
INSERT INTO contractors (company, category, tag, rates, trucks, first_name, last_name, phone, email, linkedin) VALUES
('FastMove Co',    'subcontractor', 'Premium',  '$65/hr', '3x Large, 1x Small', 'Tom',   'Harris',   '0412111222', 'tom@fastmove.com',      'https://linkedin.com/in/tomharris'),
('ProHaul Ltd',    'driver',        'Budget',   '$45/hr', '2x Medium',          'Jake',  'Williams', '0423222333', 'jake@prohaul.com',       NULL),
('QuickShift',     'mover',         'Standard', '$55/hr', '1x Large',           'Ryan',  'Davis',    '0434333444', 'ryan@quickshift.com',    'https://linkedin.com/in/ryandavis'),
('Elite Removals', 'subcontractor', 'Premium',  '$80/hr', '4x Large, 2x Small', 'Mark',  'Thompson', '0445444555', 'mark@eliteremovals.com', 'https://linkedin.com/in/markthompson'),
('City Movers',    'mover',         'Standard', '$50/hr', '2x Large',           'Steve', 'Garcia',   '0456555666', 'steve@citymovers.com',   NULL);

-- ==============================================
-- VERIFY
-- ==============================================
SELECT 'users'             AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'leads',            COUNT(*) FROM leads
UNION ALL SELECT 'jobs',             COUNT(*) FROM jobs
UNION ALL SELECT 'storage_masterlist', COUNT(*) FROM storage_masterlist
UNION ALL SELECT 'contacts',         COUNT(*) FROM contacts
UNION ALL SELECT 'contractors',      COUNT(*) FROM contractors
ORDER BY table_name;
