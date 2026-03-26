## Local Development
1. Install Docker
2. Run `npm run db:start` to start local Supabase
3. Run `npm run db:reset` to apply migrations and seed data
4. Open http://127.0.0.1:54323 for local Supabase Studio
5. Run `npm run dev` to start Next.js
6. Local app runs at http://localhost:3000

## Switching to Production
Production env vars are configured in Vercel. Local `.env.local` points to local Supabase automatically.
