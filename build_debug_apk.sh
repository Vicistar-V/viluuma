#!/bin/bash

echo "Pulling latest git changes..."
git pull

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Building web assets..."
npm run build

echo "Syncing Capacitor changes..."
npx cap sync

echo "Generating debug APK..."
nix-shell -p openjdk21 --run "cd android && ./gradlew assembleDebug"

echo "Debug APK generation complete."