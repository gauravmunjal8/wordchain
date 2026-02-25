// ─────────────────────────────────────────────────────────────────────────────
//  WordChain – Firebase Configuration
//
//  HOW TO GET YOUR CONFIG:
//  1. Go to https://console.firebase.google.com
//  2. Create a new project (or open an existing one)
//  3. Click the </> (Web) button to add a web app
//  4. Copy the firebaseConfig object shown and paste it below
//  5. In the Firebase Console:
//     • Authentication → Get started → Enable "Google" sign-in provider
//     • Firestore Database → Create database (start in production mode)
//     • Firestore → Rules → paste the rules from SETUP.md
//     • Authentication → Settings → Authorized domains → add "localhost"
// ─────────────────────────────────────────────────────────────────────────────

window.firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
