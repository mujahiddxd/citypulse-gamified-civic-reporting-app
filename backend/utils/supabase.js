/**
 * utils/supabase.js
 * -----------------
 * Creates and exports a single shared Supabase client for the backend.
 *
 * Uses the SERVICE KEY (not the anon key) so that this client bypasses
 * Row-Level Security (RLS) — this is safe on the backend because it
 * never runs in a user's browser. All backend routes import this file
 * instead of creating their own client each time.
 *
 * Environment variables needed (set in backend/.env):
 *   SUPABASE_URL         — your project URL  e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY — service_role secret key (keep private!)
 */
const { createClient } = require('@supabase/supabase-js');

// createClient() sets up the HTTP connection to your Supabase project.
// The service key gives full database access (bypasses RLS).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
