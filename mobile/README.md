# Life Planner — mobile

Expo (React Native + TypeScript) app backed by Firebase Auth and Cloud Firestore.

## Firebase setup (one time)

1. **Create the project** — [console.firebase.google.com](https://console.firebase.google.com) → *Add project*.
   To use an existing Google Cloud project, pick it from the dropdown instead of typing a new name.
2. **Auth** — *Build → Authentication → Get started → Email/Password → Enable*.
3. **Firestore** — *Build → Firestore Database → Create database*. Pick a region close to your users
   (e.g. `asia-southeast1` for Singapore/Malaysia — it can't be changed later) and start in **production mode**.
4. **Register the app** — *Project settings (⚙) → General → Your apps → Web (`</>`)*. Copy the `firebaseConfig` values.
5. `cp .env.example .env` and paste the values in.
6. **Deploy the security rules** (production mode denies everything until you do):
   ```
   npx firebase-tools login
   npx firebase-tools use --add      # pick your project
   npm run deploy:rules
   ```
   Or paste `firestore.rules` into *Firestore → Rules* in the console and publish.

## Run

```
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS). Phone and computer must be on the same Wi-Fi; otherwise use `npx expo start --tunnel`.

## Structure

```
src/app/                Expo Router screens (every file is a route)
  _layout.tsx           auth guard: signed out → login, signed in → tabs
  (tabs)/               Today · Goals · Habits · Journal · Notes
  profile.tsx           level, rank, achievements, sign out
  weekly-review.tsx
  note/[id].tsx         note editor
src/components/         shared UI, game cards, mascot, achievement toast
src/lib/
  firebase.ts           Firebase init
  firestore.ts          typed users/{uid}/<collection> + meta doc helpers
  hooks.ts              live Firestore query hooks
  *.ts                  per-feature data logic (goals, habits, tasks, quests…)
firestore.rules         each user can only access users/{their uid}/**
```

Data lives under `users/{uid}/` — collections `goals`, `milestones`, `tasks`, `habits`, `habitLogs`,
`journalEntries`, `scheduleBlocks`, `notes`, `xpEvents`, plus `meta/{achievements,weeklyBoss,northStar}`.

## Checks

```
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
