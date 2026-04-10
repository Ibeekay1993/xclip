# Clipzux

Clipzux is an AI video clipping frontend for the `clip-c2yu.onrender.com` backend and the `cgwlmqhdmcmkxkyoqiix` Supabase project.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Supabase Edge Functions
- Firebase Hosting

## Local setup

```sh
npm install
npm run dev
```

## Environment

Use a local `.env` file with:

```env
VITE_SUPABASE_PROJECT_ID="cgwlmqhdmcmkxkyoqiix"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://cgwlmqhdmcmkxkyoqiix.supabase.co"
VITE_API_URL="https://clip-c2yu.onrender.com"
```

## Deploy

- Frontend: Firebase Hosting
- Backend: Render
- Database: Supabase

