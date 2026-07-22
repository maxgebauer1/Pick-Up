# Pick Up 🏀⚽🏈

A web application that connects individual athletes for live pickup games across all sports. Think of it as a game lobby for real sports - find players, join games, and get active!

## Features

- **User Authentication**: Sign up and log in to create your athlete profile
- **Game Lobbies**: Create or join pickup games in your area
- **Real-time Updates**: Live updates when players join/leave games
- **Sport Variety**: Support for basketball, soccer, football, tennis, and more
- **Location-based**: Find games near you
- **Modern UI**: Beautiful, responsive design

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **iOS app**: Capacitor (wraps the React build in a native shell) — see [`IOS_SETUP.md`](./IOS_SETUP.md)
- **Backend**: Node.js + Express + Socket.io — see [`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md)
- **Database**: SQLite (for MVP)
- **Real-time**: Socket.io for live updates

## 📱 iOS app & 🛠️ backend

- **[`IOS_SETUP.md`](./IOS_SETUP.md)** — build Pick Up as a real, installable iOS app
  with Capacitor. Most of the scaffolding is already in this repo; the guide covers the
  Mac/Xcode steps.
- **[`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md)** — a section-by-section tour of the
  backend: how it works, how to add features, and how to deploy it.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install-all
   ```

3. Start the development servers:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
pick-up/
├── client/          # React frontend
├── server/          # Node.js backend
├── package.json     # Root package.json
└── README.md        # This file
```

## Usage

1. **Sign Up/Login**: Create an account or log in
2. **Browse Games**: View available pickup games in your area
3. **Join Games**: Click to join games that interest you
4. **Create Games**: Start your own pickup game
5. **Real-time Chat**: Communicate with other players in the lobby

## Contributing

This is an MVP version. Future enhancements could include:
- Push notifications
- Game history and ratings
- Advanced filtering
- Payment integration for facility rentals
- Team formation features

## License

MIT License 