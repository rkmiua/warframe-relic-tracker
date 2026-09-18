import SwiftData
import SwiftUI

@main
struct RelicVaultApp: App {
    private let catalog: Catalog?
    private let container: ModelContainer?
    private let failure: String?

    init() {
        var catalog: Catalog?
        var container: ModelContainer?
        var failure: String?
        do {
            catalog = try Catalog.bundled()
            container = try ModelContainer(for: PartRecord.self)
        } catch {
            failure = error.localizedDescription
        }
        self.catalog = catalog
        self.container = container
        self.failure = failure
    }

    var body: some Scene {
        WindowGroup {
            if let catalog, let container {
                RootView(catalog: catalog)
                    .modelContainer(container)
            } else {
                ContentUnavailableView(
                    "データを読み込めませんでした",
                    systemImage: "exclamationmark.triangle",
                    description: Text(failure ?? "原因不明のエラーです。")
                )
            }
        }
    }
}
