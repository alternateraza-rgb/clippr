#!/bin/bash
# Runs the Clipmuse worker and its tunnel as background services on this Mac,
# restarted automatically on crash, on login, and after a reboot.
#
#   ./scripts/install-mac-service.sh            install and start
#   ./scripts/install-mac-service.sh uninstall  stop and remove
#
# No sudo: LaunchAgents in ~/Library/LaunchAgents run as you, on login.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/clipmuse"
NPM="$(command -v npm)"
NODE_BIN="$(dirname "$(command -v node)")"
UID_NUM="$(id -u)"

# bootout returns before the job is actually gone, and bootstrapping a label
# that still exists fails with "Input/output error". Wait for it to disappear.
unload() {
  for label in com.clipmuse.worker com.clipmuse.tunnel; do
    launchctl bootout "gui/$UID_NUM/$label" 2>/dev/null || true
    for _ in $(seq 1 50); do
      launchctl print "gui/$UID_NUM/$label" >/dev/null 2>&1 || break
      sleep 0.2
    done
  done
}

if [ "${1:-}" = "uninstall" ]; then
  unload
  rm -f "$AGENTS/com.clipmuse.worker.plist" "$AGENTS/com.clipmuse.tunnel.plist"
  echo "Removed. The worker is no longer running."
  exit 0
fi

if [ ! -f "$REPO/.env.local" ]; then
  echo "No .env.local in $REPO — the worker cannot reach Supabase without it." >&2
  exit 1
fi

mkdir -p "$AGENTS" "$LOGS"

# caffeinate -i holds off idle sleep for exactly as long as the wrapped process
# lives, so the machine stays reachable without changing system power settings.
write_agent() {
  local label="$1" script="$2"
  cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-i</string>
    <string>$NPM</string>
    <string>run</string>
    <string>$script</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOGS/$label.log</string>
  <key>StandardErrorPath</key><string>$LOGS/$label.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$HOME/.local/bin:$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
PLIST
  launchctl bootstrap "gui/$UID_NUM" "$AGENTS/$label.plist"
  echo "  $label -> $LOGS/$label.log"
}

unload
echo "Installing:"
write_agent com.clipmuse.worker worker
write_agent com.clipmuse.tunnel worker:tunnel

echo
echo "Both services are running and will restart on crash, login, and reboot."
echo "Logs:   tail -f $LOGS/com.clipmuse.*.log"
echo "Status: launchctl print gui/$UID_NUM/com.clipmuse.worker | head -20"
