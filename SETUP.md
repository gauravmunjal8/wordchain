# WordChain – Setup Guide

## 1. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name (e.g. `wordchain`) → Create
3. On the project dashboard click the **`</>`** (Web) icon to register a web app
4. Copy the `firebaseConfig` object shown

## 2. Fill in your config

Open `firebase-config.js` and replace the placeholder values:

```js
window.firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

## 3. Enable Google Sign-In

Firebase Console → **Authentication** → Get started → **Sign-in method** tab →
Enable **Google** → Save.

Add `localhost` (and your production domain later) under
**Authentication → Settings → Authorized domains**.

## 4. Create Firestore database

Firebase Console → **Firestore Database** → Create database →
choose **Start in production mode** → pick a region → Done.

Paste these security rules under **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

## 5. Serve the files

Because Google Sign-In requires an HTTP origin (not `file://`), run a simple
local server:

```bash
# Option A – Node (npx, no install)
npx serve /home/user/wordchain

# Option B – Python 3
cd /home/user/wordchain && python3 -m http.server 3000

# Option C – VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open **http://localhost:3000** (or whichever port is shown).

## 6. Deploy (optional)

```bash
# Firebase Hosting (free tier)
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir = wordchain, single-page app = No
firebase deploy
```

---

## How the game works

| Tier   | Blanks | Points | Example |
|--------|--------|--------|---------|
| Easy   | 1      | +1     | BUTTER → **CUP** → CAKE |
| Medium | 2      | +2     | FIRE → **SIDE** → **WALK** → WAY |
| Hard   | 3      | +4     | THUNDER → **STORM** → **FRONT** → **LINE** → UP |

- Each blank must complete a **compound word** with the word on its left
  **and** on its right.
- Play at least one tier per day to keep your 🔥 streak alive.
- Max 7 points per day (1 + 2 + 4).
- Puzzles cycle through a 7-day set and are the same for all players.

## Adding more puzzles

Edit `puzzles.js` and add entries to the `PUZZLES` array.
Each puzzle needs:
```js
{
  easy:   { start: 'WORD', end: 'WORD', answer: ['BRIDGE'],        hint: '…', points: 1 },
  medium: { start: 'WORD', end: 'WORD', answer: ['W1', 'W2'],      hint: '…', points: 2 },
  hard:   { start: 'WORD', end: 'WORD', answer: ['W1','W2','W3'],  hint: '…', points: 4 },
}
```

Verify that every adjacent pair forms a real compound word or common phrase
before shipping!
