// import { createClient } from "@supabase/supabase-js";

// // const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
// // const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// const supabaseUrl = "http://192.168.1.77:54321";
// // const supabaseAnonKey =
// //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// // supabase service_Role_key used as supabaseanonKey
// const supabaseAnonKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export default supabase;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // using the service_role key

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
