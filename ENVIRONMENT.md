# Environment Setup

## Local Development

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase configuration values in `.env.local`:
   - Get these values from your Firebase Console (Project Settings)
   - Keys should start with `VITE_` for Vite to expose them

3. The `.env.local` file is gitignored and should never be committed.

## Netlify Deployment

To deploy to Netlify with Firebase:

1. In Netlify UI, go to **Site Settings > Build & Deploy > Environment**
2. Add environment variables for production:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. The `netlify.toml` file already includes placeholders for these variables.

## Verifying Setup

Run `npm run dev` and check the browser console:

- No errors about missing Firebase configuration
- Firebase should initialize without warnings
