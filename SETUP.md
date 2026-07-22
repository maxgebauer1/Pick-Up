# Pick Up - Setup Guide

## Prerequisites

Before running the Pick Up application, you need to install Node.js and npm.

### Installing Node.js

#### Option 1: Using Homebrew (Recommended for macOS)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

#### Option 2: Direct Download
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version for macOS
3. Run the installer

#### Option 3: Using nvm (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or run
source ~/.zshrc

# Install Node.js
nvm install --lts
nvm use --lts
```

### Verify Installation
```bash
node --version
npm --version
```

## Project Setup

Once Node.js is installed, follow these steps:

### 1. Install Dependencies
```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 2. Start the Application
```bash
# Start both server and client in development mode
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:3000`

### 3. Access the Application
Open your browser and navigate to `http://localhost:3000`

## Manual Installation (Alternative)

If the `install-all` script doesn't work, you can install dependencies manually:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

## Development Scripts

- `npm run dev` - Start both server and client
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend client
- `npm run build` - Build the frontend for production

## Features

Once the application is running, you can:

1. **Register/Login** - Create an account or sign in
2. **Browse Games** - View available pickup games
3. **Create Games** - Start your own pickup game
4. **Join Games** - Join existing games
5. **Real-time Updates** - See live updates when players join/leave
6. **Game Lobby** - View participants and game details

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error:
```bash
# Kill processes on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill processes on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

### Database Issues
The application uses SQLite which is automatically created. If you encounter database issues:
```bash
# Remove the database file (will be recreated)
rm server/pickup.db
```

### Permission Issues
If you encounter permission issues:
```bash
# Fix npm permissions
sudo chown -R $USER /usr/local/lib/node_modules
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite
- **Real-time**: Socket.io
- **Authentication**: JWT

## Next Steps

This is an MVP version. Future enhancements could include:
- Push notifications
- Game history and ratings
- Advanced filtering and search
- Payment integration
- Team formation features
- Mobile app 