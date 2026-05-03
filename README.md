# SGroups

A professional React web app built with TypeScript, Vite, Tailwind CSS, SCSS, and Firebase.

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Static typing
- **Vite** — Build tool with HMR
- **Tailwind CSS 4** — Utility-first styling
- **SCSS** — Component-level styling
- **Firebase 12** — Backend services
- **React Router 7** — Client-side routing
- **Netlify** — Deployment platform

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (for environment variables)

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Firebase configuration to `.env.local`:
   - Get these values from your [Firebase Console](https://console.firebase.google.com/)
   - Project Settings → General → Your apps
   - Copy the config and fill in the `.env.local` file

4. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

### Project Structure

```
src/
├── app/                    # Application shell
│   ├── layouts/           # Layout components
│   ├── providers/         # Context providers
│   └── router/            # Route configuration
├── pages/                 # Page components (one per folder)
├── components/            # Reusable components
│   ├── ui/               # UI components
│   ├── layout/           # Layout components
│   ├── forms/            # Form components
│   └── feedback/         # Feedback components
├── features/             # Feature modules (auth, dashboard, etc.)
├── services/
│   └── firebase/         # Firebase initialization & helpers
├── hooks/                # Custom React hooks
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── constants/            # Application constants
├── styles/               # Global styles
│   ├── globals.scss     # Global resets
│   └── tokens.scss      # SCSS variables
└── assets/              # Images, icons, fonts
```

## Available Scripts

- `npm run dev` — Start development server
- `npm run start` — Alias for `npm run dev`
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## Development Workflow

### Path Aliases

Imports use `@` prefixes for cleaner syntax:

- `@components` → `src/components`
- `@hooks` → `src/hooks`
- `@utils` → `src/utils`
- `@types` → `src/types`
- `@services` → `src/services`
- `@pages` → `src/pages`

Example:

```typescript
import { Button } from "@components/ui/Button";
import { useAuth } from "@hooks/useAuth";
```

### Styling Strategy

- **Tailwind CSS** — Utility classes for layout, spacing, responsiveness
- **SCSS** — Component-level structure and complex styles
- **CSS Variables** — Design tokens (colors, typography, spacing)

All component folders include:

- `Component.tsx` — React component
- `Component.scss` — Component styles
- `index.ts` — Barrel export

### Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed setup instructions.

Firebase environment variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Deployment

### Netlify

This project is configured for Netlify deployment:

1. Connect your repository to Netlify
2. Add environment variables in Netlify UI (Site Settings → Build & Deploy → Environment)
3. Deploy — Netlify will automatically run `npm run build`

See [netlify.toml](./netlify.toml) for build configuration.

## Code Style

- ESLint configuration enforces code quality
- TypeScript strict mode enabled
- Components use functional React with TypeScript
- Firebase imports are centralized in `src/services/firebase/firebase.ts`

Run linting:

```bash
npm run lint
```

import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
// Other configs...
// Enable lint rules for React
reactX.configs['recommended-typescript'],
// Enable lint rules for React DOM
reactDom.configs.recommended,
],
languageOptions: {
parserOptions: {
project: ['./tsconfig.node.json', './tsconfig.app.json'],
tsconfigRootDir: import.meta.dirname,
},
// other options...
},
},
])

```

```
