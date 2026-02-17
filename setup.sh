#!/bin/bash

# EdgeVision Pro - Universal Setup & Launcher
# Optimized for Linux systems

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   EdgeVision Pro Setup & Launcher   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Dependency Checks & Installation
check_and_install() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}[!] $1 is not installed.${NC}"
        echo -e "${BLUE}[*] Attempting to install $1...${NC}"
        sudo apt-get update
        sudo apt-get install -y $2
    else
        echo -e "${GREEN}[✓] $1 is already installed ($($1 --version | head -n 1))${NC}"
    fi
}

# Check for Python
check_and_install "python3" "python3 python3-venv python3-pip"

# Check for Node.js & NPM
if ! command -v node &> /dev/null; then
    echo -e "${RED}[!] Node.js is not installed.${NC}"
    echo -e "${BLUE}[*] Installing Node.js via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}[✓] Node.js is already installed ($(node -v))${NC}"
fi

# 2. Backend Setup
echo -e "\n${BLUE}[*] Setting up Backend Virtual Environment...${NC}"
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
fi

source backend/venv/bin/activate
echo -e "${BLUE}[*] Installing Backend Dependencies...${NC}"
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Frontend Setup
echo -e "\n${BLUE}[*] Installing Frontend Dependencies...${NC}"
cd frontend
npm install
cd ..

# 4. Launching Application
echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}      All systems ready! Launching...  ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${BLUE}[*] Backend: http://localhost:8000${NC}"
echo -e "${BLUE}[*] Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}[*] Press CTRL+C to stop both servers.${NC}\n"

# Stop existing processes on ports
fuser -k 8000/tcp &> /dev/null
fuser -k 5173/tcp &> /dev/null

# Run Backend
cd backend && ../backend/venv/bin/python3 main.py &
BACKEND_PID=$!

# Run Frontend
cd frontend && npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
