import Foundation

enum AppConfig {
    /// URL of your deployed React app (Static Site on Render, Netlify, etc.)
    /// Example: "https://marjane-client.onrender.com"
    /// Do NOT include a trailing slash or hash route.
    static let webAppURL = "https://marjane-security-1.onrender.com"

    /// Hash routes allowed in the app (admin dashboard only).
    static let allowedRoutePrefixes = [
        "/login",
        "/dashboard"
    ]

    static var startURL: URL {
        URL(string: "\(webAppURL)/#/login")!
    }

    static func isAllowedRoute(path: String) -> Bool {
        allowedRoutePrefixes.contains { path == $0 || path.hasPrefix("\($0)/") }
    }
}
