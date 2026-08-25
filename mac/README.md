# Clipmuse menu-bar app

A button for the worker. Start it, stop it, see whether it is reachable —
without a terminal.

## Build

```bash
./mac/build.sh install
```

Builds `Clipmuse.app` and puts it in `~/Applications`. Open it from Spotlight
or Finder: a window appears with the current status and one big button.

## The window

A coloured dot and a line telling you what is true right now:

| Dot | Meaning |
|---|---|
| Green | Worker running (and reachable from the web, if a tunnel is configured) |
| Red | Stopped — clips cannot be made |
| Orange | Starting or stopping |

One button underneath, which reads **Start the worker** or **Stop the worker**
depending on which one applies. Plus copy the public URL and open the logs.

There is a small status dot in the menu bar too, but the window is the app.
It was menu-bar only at first and that was wrong: with `LSUIElement` there is
no dock icon and no window, so double-clicking looked like nothing happened —
and on a notched Mac a full menu bar hides the icon completely.

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
