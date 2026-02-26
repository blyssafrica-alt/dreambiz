# Switching to a Different Expo Account

Use these steps so the app builds and runs under your new Expo account.

## 1. Remove the previous owner account (log out)

Log out of the current Expo account so the CLI stops using it:

```bash
eas logout
```

(Or `npx expo logout` if you use the Expo CLI.)

## 2. Clear cached Expo project data

Remove the cached project data so the app doesn't use the old account/project:

**macOS/Linux:**

```bash
rm -rf .expo
```

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
```

## 3. Log in to the new account

```bash
eas login
```

Sign in with the Expo account you want to use.

## 4. Link or create the project

**Option A – Create a new project (recommended for a clean start)**

```bash
eas build:configure
```

When prompted, choose to create a new project. EAS will register it under your account and you'll get a new **Project ID** (UUID).

**Option B – Use an existing project**

In [expo.dev](https://expo.dev) → your account → project → Settings, copy the **Project ID**.

## 5. Set the project ID in your environment

Copy `.env.example` to `.env` if you don't have one:

```bash
cp .env.example .env
```

In `.env`, set:

- **EXPO_PUBLIC_PROJECT_ID** = the Project ID from step 4 (UUID from EAS, or the ID from the Expo dashboard).

Leave other vars (Supabase, OCR, etc.) as you had them for this app.

## 6. Build

```bash
npm run build:android
# or
npm run build:ios
# or
eas build --platform all --profile production
```

The first time you run a build, EAS may ask you to confirm or link the project; use the project tied to your new account.

## 7. Start the dev server (optional)

```bash
npm start
# or
npm run start-web
```

Start scripts use `expo start` and no longer depend on the old Rork project ID.

---

**Summary of what was changed in the repo**

- **app.config.js** – EAS project ID comes from `EXPO_PUBLIC_PROJECT_ID` in `.env` (no hardcoded ID).
- **package.json** – `start` / `start-web` use `expo start` (no `-p` project ID).
- **.env.example** – Template for required env vars, including `EXPO_PUBLIC_PROJECT_ID`.

Your local `.env` is not committed. Update it with the new project ID and any other keys for the new account.
