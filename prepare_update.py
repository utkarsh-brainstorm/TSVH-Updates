#!/usr/bin/env python3
"""
TSVHS ERP OTA Update Publisher
------------------------------
This script prepares a new Over-The-Air (OTA) update for TSVHS ERP:
1. Copies the latest bundle.js and shell.css from the Android app assets.
2. Computes SHA-256 hashes for all update files.
3. Automatically increments the bundle version in updater.json and updater.
4. Leaves zero credentials or sensitive data in the public distribution folder.
"""

import os
import sys
import json
import hashlib
import shutil
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ASSETS_DIR = os.path.join(PROJECT_ROOT, "TSVH_ERP_App/app/src/main/assets")

def sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def main():
    desc = "Dynamic bug fixes and feature enhancements"
    if len(sys.argv) > 1:
        desc = " ".join(sys.argv[1:])

    # 1. Copy web assets
    os.makedirs(os.path.join(SCRIPT_DIR, "js"), exist_ok=True)
    os.makedirs(os.path.join(SCRIPT_DIR, "css"), exist_ok=True)

    src_js = os.path.join(ASSETS_DIR, "js/bundle.js")
    src_css = os.path.join(ASSETS_DIR, "css/shell.css")
    dst_js = os.path.join(SCRIPT_DIR, "js/bundle.js")
    dst_css = os.path.join(SCRIPT_DIR, "css/shell.css")

    if not os.path.exists(src_js) or not os.path.exists(src_css):
        print("Error: Source asset files not found in", ASSETS_DIR)
        sys.exit(1)

    shutil.copy2(src_js, dst_js)
    shutil.copy2(src_css, dst_css)

    # 2. Read existing updater.json
    updater_file = os.path.join(SCRIPT_DIR, "updater.json")
    cur_ver = 1
    if os.path.exists(updater_file):
        try:
            with open(updater_file, "r") as f:
                data = json.load(f)
                cur_ver = data.get("version", 1)
        except Exception:
            cur_ver = 1

    new_ver = cur_ver + 1
    new_ver_name = f"1.0.{new_ver}"
    today = datetime.now().strftime("%Y-%m-%d")

    js_hash = sha256(dst_js)
    css_hash = sha256(dst_css)

    updater_data = {
        "version": new_ver,
        "versionName": new_ver_name,
        "releaseDate": today,
        "description": desc,
        "files": [
            {
                "path": "js/bundle.js",
                "url": "js/bundle.js",
                "sha256": js_hash
            },
            {
                "path": "css/shell.css",
                "url": "css/shell.css",
                "sha256": css_hash
            }
        ],
        "apk": {
            "versionCode": 1,
            "versionName": "1.0.0",
            "url": "https://github.com/utkarsh-brainstorm/TSVH/releases/download/v1.0-beta/TSVH_ERP.apk",
            "changelog": "Initial release"
        }
    }

    json_str = json.dumps(updater_data, indent=2) + "\n"

    with open(os.path.join(SCRIPT_DIR, "updater.json"), "w") as f:
        f.write(json_str)

    with open(os.path.join(SCRIPT_DIR, "updater"), "w") as f:
        f.write(json_str)

    print(f"✅ Prepared OTA Update v{new_ver} ({new_ver_name})")
    print(f"   Description: {desc}")
    print(f"   bundle.js SHA-256: {js_hash}")
    print(f"   shell.css SHA-256: {css_hash}")
    print("\nNext step: push this folder (`update_distribution`) to your public GitHub repo (e.g. `TSVH-Updates`).")

if __name__ == "__main__":
    main()
