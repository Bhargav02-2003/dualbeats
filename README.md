# 🎵 DualBeats — Dual Music Player

A full-stack dual YouTube music player with real-time sync rooms, built with React + Node.js.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Gmail account with App Password
- YouTube Data API v3 key

---

### 1. Backend Setup

```bash
cd server
npm install
```

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dualbeats
JWT_SECRET=change_this_to_a_long_random_string
JWT_REFRESH_SECRET=change_this_to_another_long_random_string
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_gmail_app_password
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
CLIENT_URL=http://localhost:5173
```

Start backend:
```bash
npm run dev
```

---

### 2. Frontend Setup

```bash
cd client
npm install
```

Edit `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Start frontend:
```bash
npm run dev
```

Visit: **http://localhost:5173**

---

## Gmail App Password Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create app password → Select "Mail" + "Other device"
4. Copy the 16-character password → paste into `EMAIL_PASS`

## YouTube API Key Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create/select a project → Enable **YouTube Data API v3**
3. Create credentials → API key → Copy it
4. Paste into `YOUTUBE_API_KEY` in `server/.env`

---

## Features

- 🔐 Email OTP authentication (no Google/GitHub)
- 🎵 Two independent YouTube players
- 🔍 Real-time YouTube music search proxy
- 🎮 Real-time sync rooms via Socket.io
- 🌙 Dark theme with purple accents
- 📱 Responsive (desktop side-by-side, mobile stacked)

## Architecture

```
newMusic web/
├── server/           # Node.js + Express + MongoDB
│   ├── index.js      # Entry + Socket.io setup
│   ├── models/       # User, OTP schemas
│   ├── routes/       # auth, youtube routes
│   ├── controllers/  # authController, youtubeController
│   ├── middleware/   # JWT protect middleware
│   ├── socket/       # Room event handlers
│   └── utils/        # JWT helpers, OTP gen, email sender
└── client/           # React + Vite + Tailwind
    └── src/
        ├── pages/    # Login, Register, VerifyOTP, Home
        ├── components/ # Navbar, PlayerPanel, SearchBar, SearchResults, YouTubePlayer
        ├── context/  # AuthContext
        └── api/      # Axios instance with interceptors
```
