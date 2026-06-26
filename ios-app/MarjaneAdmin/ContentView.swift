import SwiftUI

struct ContentView: View {
    @State private var isLoading = true
    @State private var canGoBack = false

    var body: some View {
        ZStack(alignment: .top) {
            WebView(
                url: AppConfig.startURL,
                isLoading: $isLoading,
                canGoBack: $canGoBack
            )
            .ignoresSafeArea(edges: .bottom)

            if isLoading {
                ProgressView("Chargement...")
                    .padding(16)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    .padding(.top, 8)
            }
        }
    }
}

#Preview {
    ContentView()
}
