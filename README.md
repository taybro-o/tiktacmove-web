# 🎮 TikTacMove Web

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.x-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**TikTacMove** is a highly strategic, fast-paced, and modern twist on the classic game of Tic-Tac-Toe. Instead of simply placing marks on a grid until someone wins or draws, TikTacMove introduces a dynamic **movement phase** and **penalty system** that transforms classic Tic-Tac-Toe into a deep, competitive board game. Built with a sleek neon cyberpunk/glassmorphism theme, vanilla CSS, and Firebase Realtime Database.

---

## 💡 How to Play & Rules

TikTacMove is divided into two distinct gameplay phases:

### 1. Placement Phase (Turns 1 - 6)
* Both players start with **3 pieces** (`X` and `O`).
* Players alternate turns placing their 3 pieces on any empty cell on the 3x3 grid.
* No movement is allowed during this phase.

### 2. Advance / Movement Phase (Turns 7+)
* Once all 6 pieces are placed on the board, the board is full of your available pieces. You cannot place new ones.
* On your turn, you must **select and slide** one of your existing pieces to an empty cell.
* **Valid Moves**:
  * **Orthogonal Slide**: Move 1 or 2 cells horizontally or vertically.
  * **Diagonal Slide**: Move 1 or 2 cells diagonally.
  * **Obstacles**: Moving 2 cells (orthogonal or diagonal) is only valid if the intermediate cell (e.g. the center cell for diagonal corner-to-corner moves) is **empty**.

### ⚠️ Penalties & Double Turns
* **Illegal Moves**: Performing an invalid movement (e.g., jumping over a piece or moving to a blocked space) counts as an illegal move, triggers a warning sound, and ends your turn immediately.
* **Twice Turn Penalty**: If you accumulate **2 penalties**, your opponent is granted a special double-turn power-up (option to skip your next turn)!

### 🏆 Victory Condition
* The first player to align their **3 pieces** in a row, column, or diagonal wins the match!

---

## 🚀 Key Features

* 🤖 **Solo Mode vs CyberAI**: Play offline against our smart heuristic AI that blocks wins, takes strategic positions (center/corners), and plans ahead.
* ⚡ **Realtime Online Matchmaking**: Hop into a **Quick Match** matchmaking queue powered by Firebase Realtime Database to find and play against random opponents online.
* 🔒 **Private Rooms / Play with Friends**: Generate a lobby code, share it with a friend, and play in a secure, private lobby.
* 💬 **Live Chat & Game Feed**: Send real-time chat messages to your opponent during online games and follow the interactive round logs displaying every move made.
* 🏆 **Daily Global Leaderboard**: Compete to rank on the daily leaderboard! Features unique usernames and an automated daily reset countdown (UTC midnight reset).
* 🎵 **Pure Web Audio Synth**: Custom sound effects (Click, Select, Slide, Penalty, Win) generated using the vanilla HTML5 Web Audio API—no heavy audio assets to download.
* 🎨 **Stunning Cyberpunk Aesthetics**: Custom glassmorphism UI with smooth CSS neon-glow animations, transitions, and fully responsive layout for desktop and mobile.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Database & Backend**: [Firebase Realtime Database](https://firebase.google.com/docs/database) (Handles game state sync, matchmaking queue, live chat, and daily leaderboards)
* **Audio Engine**: Custom synthesizer using the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
* **Styling**: Vanilla CSS with modern custom properties (CSS variables), Flexbox/Grid layouts, and glassmorphism styling.

---

## 📂 Project Structure

```
├── api/                  # Empty serverless/API folder (configured for Vercel)
├── public/               # Public assets
├── src/
│   ├── assets/           # Client-side static assets
│   ├── App.css           # Core stylesheet (cyberpunk layout & animations)
│   ├── App.jsx           # Main React App component (game logic state, Firebase integration, & views)
│   ├── audio.js          # AudioSynth class utilizing Web Audio API for custom audio synthesis
│   ├── firebase.js       # Firebase SDK initialization & db reference setup
│   ├── gameLogic.js      # Pure JS game rules, valid move checks, & heuristic AI decision maker
│   ├── index.css         # Global styles & design system definitions
│   └── main.jsx          # React app entrypoint
├── .env                  # Local environment variables (Firebase config)
├── eslint.config.js      # ESLint linting configuration
├── index.html            # Entry HTML page (custom font imports and metadata)
├── package.json          # Project metadata, scripts, and package dependencies
├── vercel.json           # Vercel hosting rules and configurations
└── vite.config.js        # Vite configuration settings
```

---

## 💻 Getting Started

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### ⚙️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/taybro-o/tiktacmove-web.git
   cd tiktacmove-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase Environment Variables**:
   Create a `.env` file in the root directory and add your Firebase project configuration:
   ```env
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
   VITE_FIREBASE_DATABASE_URL="your-database-url"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
   VITE_FIREBASE_APP_ID="your-app-id"
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173` to play!

5. **Build for Production**:
   ```bash
   npm run build
   ```

