// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://tcwzklwrtzcwamiuesii.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjd3prbHdydHpjd2FtaXVlc2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMjAzNjUsImV4cCI6MjA2MDc5NjM2NX0.1HJyrU0TPDgRMRXvnmtLDjOul3GcLV77M7FMcWScmbs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);