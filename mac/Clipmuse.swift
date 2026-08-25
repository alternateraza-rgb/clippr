import AppKit

/// A window with a button for the Clipmuse worker, plus a menu-bar icon.
///
/// It was menu-bar only at first, which was a mistake: with LSUIElement there
/// is no dock icon and no window, so double-clicking the app looks like nothing
/// happened — and on a notched Mac a crowded menu bar hides the icon outright.
/// The window is the app now; the menu-bar icon is a convenience on top.
///
/// Everything it does runs through `scripts/install-mac-service.sh`, so the app
/// and the terminal can never disagree about how the worker is started.
final class Controller: NSObject, NSApplicationDelegate {
    private let repo = "__REPO__"

    private var window: NSWindow!
    private var statusItem: NSStatusItem!
    private var timer: Timer?

    private let dot = NSTextField(labelWithString: "●")
    private let headline = NSTextField(labelWithString: "Checking…")
    private let detail = NSTextField(labelWithString: "")
    private let primary = NSButton()
    private let copyButton = NSButton()
    private let logsButton = NSButton()

    private var workerUp = false
    private var tunnelUp = false
    private var busy = true
    private var tunnelURL: String?

    func applicationDidFinishLaunching(_ notification: Notification) {
        tunnelURL = readEnv("NGROK_DOMAIN").map { "https://\($0)" }
        buildWindow()
        buildStatusItem()
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 6, repeats: true) { [weak self] _ in
            self?.refresh()
        }
    }

    /// Clicking the dock icon reopens the window instead of doing nothing.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showWindow()
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    // MARK: - UI

    private func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 380, height: 250),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Clipmuse"
        window.center()
        window.isReleasedWhenClosed = false

        let content = NSView(frame: window.contentLayoutRect)
        content.autoresizingMask = [.width, .height]

        dot.font = .systemFont(ofSize: 13)
        dot.frame = NSRect(x: 28, y: 186, width: 16, height: 18)

        headline.font = .systemFont(ofSize: 17, weight: .semibold)
        headline.frame = NSRect(x: 48, y: 184, width: 300, height: 22)

        detail.font = .systemFont(ofSize: 12)
        detail.textColor = .secondaryLabelColor
        detail.frame = NSRect(x: 48, y: 162, width: 310, height: 18)

        primary.frame = NSRect(x: 28, y: 100, width: 324, height: 40)
        primary.bezelStyle = .rounded
        primary.controlSize = .large
        primary.font = .systemFont(ofSize: 15, weight: .medium)
        primary.target = self
        primary.keyEquivalent = "\r"

        copyButton.frame = NSRect(x: 28, y: 56, width: 158, height: 30)
        copyButton.bezelStyle = .rounded
        copyButton.title = "Copy public URL"
        copyButton.target = self
        copyButton.action = #selector(copyURL)
        copyButton.isHidden = tunnelURL == nil

        logsButton.frame = NSRect(x: 194, y: 56, width: 158, height: 30)
        logsButton.bezelStyle = .rounded
        logsButton.title = "Open logs"
        logsButton.target = self
        logsButton.action = #selector(openLogs)

        let footer = NSTextField(labelWithString: "Closing this window leaves the worker running.")
        footer.font = .systemFont(ofSize: 11)
        footer.textColor = .tertiaryLabelColor
        footer.frame = NSRect(x: 28, y: 24, width: 324, height: 16)

        for view in [dot, headline, detail, primary, copyButton, logsButton, footer] {
            content.addSubview(view)
        }
        window.contentView = content
        showWindow()
    }

    private func buildStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        let menu = NSMenu()
        let open = NSMenuItem(title: "Open Clipmuse", action: #selector(showWindow), keyEquivalent: "")
        open.target = self
        menu.addItem(open)
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q")
        quit.target = self
        menu.addItem(quit)
        statusItem.menu = menu
    }

    @objc private func showWindow() {
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func render() {
        let running = workerUp

        if busy {
            dot.textColor = .systemOrange
            headline.stringValue = "Working…"
            detail.stringValue = "Starting or stopping the services"
        } else if running {
            dot.textColor = .systemGreen
            headline.stringValue = "Worker is running"
            detail.stringValue = tunnelURL == nil
                ? "Serving on localhost:8787"
                : (tunnelUp ? "Reachable from the web" : "Tunnel offline — the site cannot reach it")
        } else {
            dot.textColor = .systemRed
            headline.stringValue = "Worker is stopped"
            detail.stringValue = "Clips cannot be made until you start it"
        }

        primary.title = running ? "Stop the worker" : "Start the worker"
        primary.action = running ? #selector(stop) : #selector(start)
        primary.isEnabled = !busy

        // Menu-bar icon mirrors the window, and always carries a title so it can
        // never render as a zero-width invisible item.
        statusItem.button?.title = busy ? "◐" : (running ? "●" : "○")
        statusItem.button?.contentTintColor = busy
            ? .systemOrange
            : (running ? .systemGreen : .secondaryLabelColor)
    }

    // MARK: - State

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
            // ngrok answers with its own error page when the session has died,
            // so a 200 alone is not proof the worker is behind it.
            done(code == 200 && body.contains("\"ok\":true"))
        }.resume()
    }

    private func refresh() {
        probe("http://127.0.0.1:8787", timeout: 3) { [weak self] up in
            DispatchQueue.main.async {
                guard let self else { return }
                self.workerUp = up
                if !self.busy { self.render() }
            }
        }
        guard let tunnel = tunnelURL else {
            if busy { busy = false; render() }
            return
        }
        probe(tunnel, timeout: 8) { [weak self] up in
            DispatchQueue.main.async {
                guard let self else { return }
                self.tunnelUp = up
                self.busy = false
                self.render()
            }
        }
    }

    // MARK: - Actions

    private func runScript(_ argument: String) {
        busy = true
        render()
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/bin/bash")
            task.arguments = ["-lc", "cd '\(self.repo)' && ./scripts/install-mac-service.sh \(argument)"]
            try? task.run()
            task.waitUntilExit()
            DispatchQueue.main.async { self.refresh() }
        }
    }

    @objc private func start() { runScript("") }
    @objc private func stop() { runScript("uninstall") }

    @objc private func openLogs() {
        NSWorkspace.shared.open(URL(fileURLWithPath: "\(NSHomeDirectory())/Library/Logs/clipmuse"))
    }

    @objc private func copyURL() {
        guard let tunnel = tunnelURL else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(tunnel, forType: .string)
        copyButton.title = "Copied"
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.copyButton.title = "Copy public URL"
        }
    }

    @objc private func quit() { NSApp.terminate(nil) }
}

let app = NSApplication.shared
let controller = Controller()
app.delegate = controller
// .regular, not .accessory: the app needs a dock icon and a window, or opening
// it looks like nothing happened.
app.setActivationPolicy(.regular)
app.run()
