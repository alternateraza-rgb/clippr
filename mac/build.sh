#!/bin/bash
# Builds Clipmuse.app — a menu-bar button for starting and stopping the worker.
#
#   ./mac/build.sh            build into mac/build/
#   ./mac/build.sh install    build, then put it in ~/Applications
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$REPO/mac/build"
APP="$BUILD/Clipmuse.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# The app shells out to the same script the terminal uses, so it needs to know
# where the repo lives. Baked in at build time rather than guessed at runtime.
sed "s|__REPO__|$REPO|g" "$REPO/mac/Clipmuse.swift" > "$BUILD/Clipmuse.gen.swift"

swiftc -O \
  -target arm64-apple-macosx13.0 \
  -framework AppKit \
  -o "$APP/Contents/MacOS/Clipmuse" \
  "$BUILD/Clipmuse.gen.swift"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Clipmuse</string>
  <key>CFBundleDisplayName</key><string>Clipmuse</string>
  <key>CFBundleIdentifier</key><string>com.clipmuse.control</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>Clipmuse</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <!-- Menu-bar only: no dock icon, no window on launch. -->
  <key>LSUIElement</key><true/>
  <!-- The worker is plain http on localhost. -->
  <key>NSAppTransportSecurity</key>
  <dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict>
</plist>
PLIST

# Ad-hoc signature: enough for a locally built app, and without it macOS kills
# unsigned binaries on launch.
codesign --force --deep --sign - "$APP" 2>/dev/null || true

echo "Built $APP"

if [ "${1:-}" = "install" ]; then
  mkdir -p "$HOME/Applications"
  rm -rf "$HOME/Applications/Clipmuse.app"
  cp -R "$APP" "$HOME/Applications/Clipmuse.app"
  echo "Installed to ~/Applications/Clipmuse.app"
fi
