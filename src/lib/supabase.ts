import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://nejxsmguhyqxdlvjdylo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lanhzbWd1aHlxeGRsdmpkeWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MDg5MDksImV4cCI6MjA5OTA4NDkwOX0.ZnM6Ma_IlBsEy4QMDxCYXDxBm4fQFIagmw__ldZp5xg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
