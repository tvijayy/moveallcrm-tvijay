-- ==============================================
-- MoveHome CRM - verify_password RPC function
-- Run this in Supabase SQL Editor
-- ==============================================

-- Enable pgcrypto extension (needed for crypt/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old version if exists
DROP FUNCTION IF EXISTS verify_password(text, text);

-- Create the RPC function that the frontend calls
-- Called with: { p_email: "...", p_password: "..." }
CREATE OR REPLACE FUNCTION verify_password(p_email text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hash text;
BEGIN
    SELECT password_hash INTO v_hash
    FROM users
    WHERE email = p_email
    LIMIT 1;

    IF v_hash IS NULL THEN
        RETURN false;
    END IF;

    -- Compare the provided password against the stored bcrypt hash
    RETURN (crypt(p_password, v_hash) = v_hash);
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION verify_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_password(text, text) TO authenticated;
