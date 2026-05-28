#!/usr/bin/env bash
# Focus Reader — local launcher (macOS / Linux)
# Downloads: https://github.com/your-org/focus-reader
# Requires: Node.js 18+  →  https://nodejs.org

set -e

# Always run from the directory containing this script,
# regardless of where it was launched from.
cd "$(dirname "$0")"

echo ""
echo "  📖 Focus Reader"
echo "  ───────────────"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
  echo ""
  echo "  ✗ Node.js is required but not installed."
  echo "    Download it at: https://nodejs.org"
  echo ""
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo ""
  echo "  ✗ Node.js 18 or newer is required (you have v$(node --version))."
  echo "    Download the latest LTS at: https://nodejs.org"
  echo ""
  exit 1
fi

# 2. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo ""
  echo "  Installing dependencies (one-time setup)..."
  npm install --silent
fi

# 3. Build the app
echo ""
echo "  Building app..."
npm run build --silent

# 4. Launch
echo ""
echo "  ✓ Focus Reader is running at: http://localhost:3000"
echo "  Open that URL in your browser."
echo "  Press Ctrl+C to stop."
echo ""

npm run preview:local
