# TSVHS ERP Public Update Distribution

This directory contains the files needed for Over-The-Air (OTA) updates for the TSVHS ERP Android application.

## How it works

1. The Android app checks for updates on startup from your public GitHub repository:
   - Primary: `https://raw.githubusercontent.com/utkarsh-brainstorm/TSVH-Updates/main/updater.json`
   - Fallback: `https://raw.githubusercontent.com/utkarsh-brainstorm/TSVH-Updates/main/updater`
2. It compares the remote `version` with the version running in the app.
3. If the remote version is higher:
   - The app displays the waiting screen: **"updating the app pls wait 😊"**
   - Downloads the updated files (`bundle.js`, `shell.css`, etc.) directly into private app storage.
   - Verifies SHA-256 hashes to guarantee security and prevent file corruption.
   - Updates the version in local storage and reloads the interface immediately.
   - **No APK re-installation or user prompts required!**

## How to publish a new update

1. Run the update script to package your latest changes and bump the version:
   ```bash
   python3 update_distribution/prepare_update.py "Added new fee calculation and UI improvements"
   ```

2. Initialize or push this directory to your public GitHub repository (e.g. `TSVH-Updates`):
   ```bash
   cd update_distribution
   git init -b main
   git remote add origin https://github.com/utkarsh-brainstorm/TSVH-Updates.git
   git add .
   git commit -m "Publish OTA Update"
   git push -u origin main --force
   ```

## Security Note

This public directory contains **only web bundles, styles, and update descriptors**. It does **not** contain any passwords, private keys, or school credentials.
