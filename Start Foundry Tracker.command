#!/bin/bash
cd "$(dirname "$0")"

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not on PATH."
  echo "Install Node.js 18+ from https://nodejs.org/ then run this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "First run: installing dependencies..."
  npm install || {
    echo "npm install failed."
    read -r -p "Press Enter to close..."
    exit 1
  }
fi

echo ""
echo "Starting Foundry Rejection Tracker at http://localhost:5176"
echo "Close this terminal window to stop the application."
echo ""

npm run dev -- --host localhost --port 5176 --strictPort --open

echo ""
read -r -p "Press Enter to close..."
