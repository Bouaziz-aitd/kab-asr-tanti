#!/usr/bin/env bash
# build.sh - Script to install backend dependencies

echo "Running build.sh: Installing Python dependencies from current directory..."
pip install -r requirements.txt
echo "Python dependencies installed."