# Firebase Setup Guide for React Native Expo

This guide walks you through setting up Firebase in your React Native Expo project.

## Prerequisites

- Node.js and npm installed
- Expo CLI (`npx expo`)
- A Google account for Firebase Console

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select existing project)
3. Enter project name (e.g., "TicketingApp")
4. Disable Google Analytics if not needed (optional)
5. Click **Create project**

---

## Step 2: Register Your App

1. In Firebase Console, click the **Web** icon (`</>`) to add a web app
2. Register app nickname (e.g., "Mobile App")
3. **Do not** check "Firebase Hosting" for a mobile app
4. Click **Register app**
5. Copy the `firebaseConfig` object values

---

## Step 3: Configure firebaseConfig

1. Open `config/firebase.ts` in your project
2. Replace placeholder values with your Firebase config:

```typescript
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

**Production Tip:** Use environment variables with `app.config.js`:

```javascript
// app.config.js
export default {
  expo: {
    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      // ... other config
    },
  },
};
```

---

## Step 4: Enable Authentication

1. In Firebase Console → **Build** → **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. (Optional) Enable **Email link** for password reset

---

## Step 5: Create Firestore Database

1. In Firebase Console → **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** for development (you'll add security rules later)
4. Select a location (choose closest to your users)
5. Click **Enable**

---

## Step 6: (Optional) Firebase Storage

If you need file uploads (e.g., ticket attachments, profile pictures):

1. Go to **Build** → **Storage**
2. Click **Get started**
3. Use default security rules for development
4. Choose location and **Done**

---

## Step 7: Install Dependencies (Already Done)

```bash
npm install firebase @react-native-async-storage/async-storage zustand
```

---

## Step 8: Verify Setup

1. Ensure `config/firebase.ts` has your real values
2. Run the app: `npx expo start`
3. Try signing up - a new user should appear in **Authentication** > **Users**
4. Check **Firestore** > **Data** - a `users` document should be created

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Firebase: Error (auth/...)"" | Check Authentication is enabled, verify email/password format |
| "Missing or insufficient permissions" | Update Firestore security rules (see FIRESTORE_RULES.md) |
| App crashes on Firebase init | Verify all config values are correct, no typos |
| CORS errors (web) | Firebase JS SDK handles this; ensure you're using the web config |

---

## Security Checklist (Before Production)

- [ ] Move Firebase config to environment variables
- [ ] Deploy Firestore security rules (never use test mode)
- [ ] Enable App Check for additional security
- [ ] Add Firebase config to `.gitignore` if using local env files
