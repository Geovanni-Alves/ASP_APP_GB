// server/server.js
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase setup with secure key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/invite-contact
app.post("/api/invite-contact", async (req, res) => {
  const { email, firstName, lastName } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const { error, data } = await supabase.auth.admin.createUser({
    email,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (!error) {
    await supabase.auth.admin.inviteUserByEmail(email);
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true, data });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
