# Auth Boilerplate (auth-boilerplate)

Firebase Auth + Pinia + Quasar starter focused on a clean, reusable auth architecture.

## Quick start

1. Install dependencies.
2. Create your .env file with Firebase config.
3. Start the app in development mode.
4. Open /login and sign in.
5. Confirm authenticated users are redirected away from /login to /.
6. Confirm unauthenticated users are redirected from protected routes to /login.

```bash
npm install
npm install firebase
npm install dotenv --save
npm run dev
```

## Install

```bash
npm install
npm install firebase
npm install dotenv --save
```

## Environment variables

Create a .env file in the project root. These values are consumed by src/boot/firebase.js.

```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Run

```bash
npm run dev
```

Notes:

- FIREBASE_MEASUREMENT_ID is optional if you are not using Analytics.
- Use separate .env files per environment when needed (for example .env.development and .env.production).
- Do not commit real secrets to public repositories.

## Auth lifecycle

This project keeps listener wiring in the boot layer and keeps state logic in the store.

```text
App boot
  -> src/boot/firebase.js runs
  -> Firebase app/auth/db are initialized
  -> A single onAuthStateChanged listener is attached (with duplicate-listener protection)
  -> Listener fires with current user (or null)
  -> authStore.syncAuthState(user) updates:
       - firebaseUser
       - profile (from Firestore when user exists)
       - initialized = true
  -> authReady promise resolves after first auth sync
  -> router guard continues navigation safely
```

## Routing safeguards

The router waits for auth initialization before applying redirects.

- If auth is not initialized, guard waits for authReady with an 8s timeout fallback.
- Unauthenticated users are redirected to /login for protected and non-public routes.
- Authenticated users are redirected to / when trying to access guest-only routes like /login.
- Public routes (for example the not-found route) remain accessible without auth.

Route meta currently used:

- requiresAuth: only authenticated users can access.
- guestOnly: only unauthenticated users can access.
- public: always accessible.

## Why this architecture is reusable

- Boot owns external subscriptions and lifecycle concerns.
- Store owns auth state transitions and auth actions.
- Router owns navigation policy and access control.

This separation makes the boilerplate easier to port into other projects with minimal coupling.
