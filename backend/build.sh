#!/usr/bin/env bash
# build.sh - Script to install backend dependencies

echo "Running build.sh: Installing Python dependencies..."
pip install -r requirements.txt
echo "Python dependencies installed."