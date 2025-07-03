asp_app_gb – After‑School Pickup & Drop‑Off Management

A full‑stack system for managing student transportation in an After‑School Program. It streamlines scheduling, van assignments, real‑time attendance, and automated PDF exports for routes and drop‑off times.

⚠️ This project is still under development and not ready for production use. I'm actively working on it.

Table of Contents

Features

Tech Stack

Architecture

Project Structure

Getting Started

Prerequisites

Environment Variables

Local Development

Mobile App (Expo)

Backend (Express)

Database Migrations

Usage Guide

Deployment

Contributing

License

Acknowledgements

Features

Student & Contact Management – CRUD operations, multiple addresses per student, invite flow for contacts via Supabase Auth.

Vans Management – Create, edit, delete vans; seat and booster seat tracking.

Pickup Planner – Calendar‑driven UI that groups students by school; drag‑and‑drop assignment to vans; absence tracking.

Route & Drop‑Off Export – Generates route PDFs, Google Maps links, and drop‑off time sheets; vehicle selection dialog mirrors spreadsheet workflow.

Attendance Schedule – Editable weekly attendance linked to students_schedule table.

Staff Administration – Invite flow and profile editing similar to students.

Cross‑platform – React web dashboard + Expo mobile client backed by a shared Supabase database and an Express API layer.

Tech Stack

Layer

Libraries / Services

Front‑end (Web)

React 18, Ant Design, react‑beautiful‑dnd, SCSS

Mobile

React Native (Expo SDK — managed workflow)

Backend API

Node 18, Express, Supabase JS

Database

Supabase (PostgreSQL + Row Level Security)

Auth

Supabase Email Auth (invite flow)

Storage

Supabase Storage (student photos, PDFs)

Maps & Geocoding

Google Maps JavaScript & Places APIs

CI / CD

GitHub Actions (lint, test, build, deploy)

Deploy

Vercel (web), Expo EAS (mobile), Supabase Hosting

Architecture

Web (React)  ─┐
              │
Mobile (Expo) ├──► Supabase (DB, Auth, Storage, Functions)
              │
Express API ──┘

The web dashboard and mobile app share a common Supabase client. The Express server hosts privileged endpoints (e.g. contact invites) using the Supabase service role key and handles PDF generation / storage.

Project Structure

asp_app_gb/
├─ apps/
│  ├─ web/          # React dashboard
│  └─ mobile/       # Expo client
├─ server/          # Express API (REST)
├─ supabase/
│  ├─ migrations/   # SQL change sets
│  └─ seed.sql
├─ scripts/         # one‑off utilities (PDF, data import)
├─ .env.example
└─ README.md

Getting Started

Prerequisites

Node ≥ 18

Yarn or npm

Expo CLI (npm i -g expo-cli)

Supabase Project (free tier is fine)

Optional: Google Cloud project for Maps & Places API.

Environment Variables

Copy .env.example to .env (root) and fill in the values:

SUPABASE_URL=https://<your‑ref>.supabase.co
SUPABASE_ANON_KEY=public‑anon‑key
SUPABASE_SERVICE_ROLE_KEY=service‑role‑key   # server only
GOOGLE_MAPS_API_KEY=xxxxxxxxxxxx
PORT=4000                                    # server port

The mobile and web apps read from .env, but Expo also looks for app.json / app.config.js.

Local Development

# Install deps
yarn

# Start the Express API
yarn server         # runs on http://localhost:4000

# Start the React dashboard
yarn web            # opens at http://localhost:3000

Mobile App (Expo)

cd apps/mobile
expo start          # run on iOS / Android / web

Backend (Express)

The server exposes /api/* endpoints. See server/README.md for route details.

yarn server:dev     # auto‑restarts with nodemon

Database Migrations

supabase db diff --file supabase/migrations/<name>.sql
supabase db push

Or run the SQL files in supabase/migrations via the Supabase UI.

Usage Guide

Login / Invite – Admin creates staff/parent contacts; choose to send invite email.

Create Vans – Define seat counts and booster availability.

Add Students – Input personal info, assign school, addresses, van.

Plan Pickup – On the Pickup Planner page, choose weekday → drag students into vans → save.

Export Routes – Tools → "Export Selected Vehicles" → choose vehicles → PDFs + Maps links are saved to Supabase Storage and downloadable.

Record Drop‑Off – Mobile app shows today’s roster; drivers tap students on drop‑off; ETA PDFs auto‑update.

Deployment

Target

Command / Workflow

Web (Vercel)

vercel --prod or GitHub Action

Mobile (Expo EAS)

eas build --platform ios,android

API (Railway / Render)

Dockerfile in /server

Supabase

supabase db push + import Storage bucket

Configure production env vars in each platform.

Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

Fork & clone the repo

yarn install

Create a branch: git checkout -b feature/XYZ

Commit with conventional commits

Push and open a PR

Run yarn lint && yarn test before pushing.

License

MIT

Acknowledgements

Icons by Lucide

UI components by Ant Design

