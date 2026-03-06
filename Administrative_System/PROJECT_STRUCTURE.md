# Project Folder Structure

```
mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (AuthProvider, ThemeProvider)
│   ├── index.tsx                 # Root index - redirects based on auth
│   ├── modal.tsx                 # Modal screen (optional)
│   ├── (auth)/                  # Auth group (unauthenticated)
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   └── (app)/                    # Main app group (authenticated)
│       ├── _layout.tsx           # App layout - protects routes, role redirect
│       ├── index.tsx             # Redirects to admin or user
│       ├── (admin)/              # Admin-only routes
│       │   ├── _layout.tsx       # Admin tabs layout
│       │   └── index.tsx         # Admin dashboard
│       └── (user)/               # User routes
│           ├── _layout.tsx       # User tabs layout
│           └── index.tsx         # User dashboard
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── IconSymbol.tsx
│   │   └── ...
│   ├── themed-text.tsx
│   └── themed-view.tsx
│
├── config/
│   └── firebase.ts               # Firebase config (replace with your values)
│
├── contexts/
│   └── AuthContext.tsx           # Auth state, signIn, signUp, signOut, etc.
│
├── hooks/
│   ├── use-color-scheme.ts
│   └── use-theme-color.ts
│
├── services/
│   └── firebase.ts               # Firebase init, Auth & Firestore helpers
│
├── constants/
│   └── theme.ts
│
├── assets/
│   └── images/
│
├── FIREBASE_SETUP.md             # Firebase setup guide
├── FIRESTORE_SCHEMA.md           # Database schema
├── firestore.rules               # Firestore security rules (deploy to Firebase)
└── PROJECT_STRUCTURE.md          # This file
```

## State Management: Context API vs Zustand

**Recommendation: Context API (used for auth)**  
- Auth state is hierarchical and needs provider wrapping  
- Simpler for auth: user, profile, loading, error  
- Session persistence via AsyncStorage  

**Zustand** (installed) can be used for:
- Complex global state (e.g., ticket filters, course selections)
- State that doesn't need provider hierarchy
- Example: `useTicketStore`, `useCourseStore`

## Route Protection Summary

| Route          | Access                      |
|----------------|-----------------------------|
| `/(auth)/*`    | Unauthenticated users only  |
| `/(app)/(admin)/*` | Admin role only         |
| `/(app)/(user)/*`  | Regular user role only  |

Regular users cannot access admin routes; they are redirected to the user dashboard.
