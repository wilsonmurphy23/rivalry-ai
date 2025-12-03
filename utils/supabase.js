/* ====================================
   SUPABASE CLIENT INITIALIZATION
   ==================================== */

const SUPABASE_URL = 'https://qnplrybkdcwngzofufcw.supabase.co';
// This is your PUBLIC Anon Key (Safe for frontend)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGxyeWJrZGN3bmd6b2Z1ZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Mjg0MTcsImV4cCI6MjA4MDIwNDQxN30.1N4lPvAnFKHN_rIlAPfBmx9m5D_3FFso9BQ74NIF6_0';

// Initialize Client
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase client initialized');