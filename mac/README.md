# Clipmuse menu-bar app

A button for the worker. Start it, stop it, see whether it is reachable —
without a terminal.

## Build

```bash
./mac/build.sh install
```

Builds `Clipmuse.app` and puts it in `~/Applications`. Open it from Spotlight
or Finder; a scissors icon appears in the menu bar.

## What the icon means

| Icon | Meaning |
|---|---|
| Filled, red | Worker running and reachable from the web |
| Hollow, grey | Stopped, or the tunnel is down |
| Hourglass | Starting or stopping |

Click it for the menu: current status, **Start** or **Stop**, copy the public
URL, and open the logs folder.

## What the buttons actually do

Exactly what `scripts/install-mac-service.sh` does — the app is a face for the
same launchd agents, so it can never disagree with the terminal.

- **Start** installs and starts both agents (worker + tunnel). They then come
  back on their own after a crash, a login, or a reboot.
- **Stop** removes them. The worker stays down until you press Start again,
  including across reboots — that is what a stop button should mean.

Quitting the app does **not** stop the worker. It is a remote control, not the
thing itself.

## Start it automatically at login

System Settings → General → Login Items → **+** → `~/Applications/Clipmuse.app`.
