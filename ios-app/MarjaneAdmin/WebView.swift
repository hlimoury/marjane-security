import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var canGoBack: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        context.coordinator.webView = webView
        webView.load(URLRequest(url: url))

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.parent = self
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebView
        weak var webView: WKWebView?

        init(_ parent: WebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            parent.canGoBack = webView.canGoBack
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            parent.canGoBack = webView.canGoBack
            enforceDashboardOnly(in: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            parent.canGoBack = webView.canGoBack
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            parent.canGoBack = webView.canGoBack
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // Keep in-app navigation on the configured host; open external links in Safari.
            if let host = url.host,
               let appHost = URL(string: AppConfig.webAppURL)?.host,
               host != appHost,
               navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        private func enforceDashboardOnly(in webView: WKWebView) {
            let script = """
            (function() {
              var hash = window.location.hash || '';
              var path = hash.replace(/^#/, '') || '/';
              var allowed = \(allowedPathsJSON());
              var ok = allowed.some(function(prefix) {
                return path === prefix || path.indexOf(prefix + '/') === 0;
              });
              if (!ok && path !== '/') {
                window.location.hash = '#/dashboard';
              }
            })();
            """
            webView.evaluateJavaScript(script, completionHandler: nil)
        }

        private func allowedPathsJSON() -> String {
            let paths = AppConfig.allowedRoutePrefixes.map { "\"\($0)\"" }
            return "[\(paths.joined(separator: ", "))]"
        }
    }
}
