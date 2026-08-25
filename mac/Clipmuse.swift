import AppKit

/// Menu-bar control for the Clipmuse worker and its tunnel.
///
/// The services are launchd agents; this is a face for them. Everything it does
/// is what `scripts/install-mac-service.sh` already does, so the app and the
/// terminal can never disagree about how the worker is started.
final class Controller: NSObject, NSApplicationDelegate {
    private let repo = "__REPO__"
    private var statusItem: NSStatusItem!
    private var timer: Timer?

    private var workerUp = false
    private var tunnelUp = false
    private var busy = false
    private var tunnelURL: String?

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.image = NSImage(
            systemSymbolName: "scissors",
            accessibilityDescription: "Clipmuse"
        )
        tunnelURL = readEnv("NGROK_DOMAIN").map { "https://\($0)" }

        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 6, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    // MARK: - State

    /// Reads a value out of the repo's .env.local so the app and the worker
    /// always agree on the tunnel address.
    private func readEnv(_ key: String) -> String? {
        guard let text = try? String(contentsOfFile: "\(repo)/.env.local", encoding: .utf8) else {
            return nil
        }
        for line in text.split(separator: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.hasPrefix("#"), let eq = trimmed.firstIndex(of: "=") else { continue }
            if trimmed[..<eq].trimmingCharacters(in: .whitespaces) == key {
                return trimmed[trimmed.index(after: eq)...]
                    .trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
            }
        }
        return nil
    }

    private func probe(_ url: String, timeout: TimeInterval, done: @escaping (Bool) -> Void) {
        guard let target = URL(string: "\(url)/health") else { return done(false) }
        var request = URLRequest(url: target)
        request.timeoutInterval = timeout
        URLSession.shared.dataTask(with: request) { data, response, _ in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            let body = String(data: data ?? Data(), encoding: .utf8) ?? ""
            // The tunnel answers with ngrok's own error page when the session is
            // dead, so a 200 alone is not proof the worker is behind it.
            done(code == 200 && body.contains("\"ok\":true"))
        }.resume()
    }

    private func refresh() {
        probe("http://127.0.0.1:8787", timeout: 3) { [weak self] up in
            DispatchQueue.main.async {
                self?.workerUp = up
                self?.render()
            }
        }
        if let tunnel = tunnelURL {
            probe(tunnel, timeout: 8) { [weak self] up in
                DispatchQueue.main.async {
                    self?.tunnelUp = up
                    self?.render()
                }
            }
        }
    }

    // MARK: - Actions

    private func runScript(_ arguments: [String]) {
        busy = true
        render()
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/bin/bash")
            task.arguments = ["-lc", "cd \(self.repo) && ./scripts/install-mac-service.sh \(arguments.joined(separator: " "))"]
            try? task.run()
            task.waitUntilExit()
            DispatchQueue.main.async {
                self.busy = false
                self.refresh()
            }
        }
    }

    @objc private func start() { runScript([]) }
    @objc private func stop() { runScript(["uninstall"]) }

    @objc private func openLogs() {
        NSWorkspace.shared.open(
            URL(fileURLWithPath: "\(NSHomeDirectory())/Library/Logs/clipmuse")
        )
    }

    @objc private func copyURL() {
        guard let tunnel = tunnelURL else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(tunnel, forType: .string)
    }

    @objc private func quit() { NSApp.terminate(nil) }

    // MARK: - Menu

    private func render() {
        // The icon carries the state, so the answer to "is it running" needs no
        // click: filled and red when serving, hollow when not.
        let running = workerUp && (tunnelURL == nil || tunnelUp)
        statusItem.button?.image = NSImage(
            systemSymbolName: busy ? "hourglass" : (running ? "scissors.circle.fill" : "scissors.circle"),
            accessibilityDescription: "Clipmuse"
        )
        statusItem.button?.contentTintColor = busy
            ? .secondaryLabelColor
            : (running ? NSColor.systemRed : .secondaryLabelColor)

        let menu = NSMenu()
        menu.addItem(info(workerUp ? "Worker running" : "Worker stopped"))
        if tunnelURL != nil {
            menu.addItem(info(tunnelUp ? "Reachable from the web" : "Tunnel offline"))
        }
        menu.addItem(.separator())

        if busy {
            menu.addItem(info("Working…"))
        } else if workerUp {
            menu.addItem(action("Stop the worker", #selector(stop)))
        } else {
            menu.addItem(action("Start the worker", #selector(start)))
        }

        menu.addItem(.separator())
        if tunnelURL != nil {
            menu.addItem(action("Copy public URL", #selector(copyURL)))
        }
        menu.addItem(action("Open logs", #selector(openLogs)))
        menu.addItem(.separator())
        menu.addItem(action("Quit Clipmuse", #selector(quit)))
        statusItem.menu = menu
    }

    private func info(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    private func action(_ title: String, _ selector: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: selector, keyEquivalent: "")
        item.target = self
        return item
    }
}

let app = NSApplication.shared
let controller = Controller()
app.delegate = controller
// Menu-bar only: no dock icon, no window.
app.setActivationPolicy(.accessory)
app.run()
