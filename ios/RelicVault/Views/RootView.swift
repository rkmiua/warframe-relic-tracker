import SwiftData
import SwiftUI

struct RootView: View {
    let catalog: Catalog

    @Environment(\.modelContext) private var modelContext
    @State private var store: PartStore?
    @AppStorage("selectedTab") private var selectedTab = 0

    var body: some View {
        Group {
            if let store {
                TabView(selection: $selectedTab) {
                    Tab("レリック", systemImage: "shippingbox", value: 0) {
                        RelicListView()
                    }
                    Tab("Prime", systemImage: "square.grid.2x2", value: 1) {
                        SetListView()
                    }
                    Tab(value: 2, role: .search) {
                        PartSearchView()
                    }
                }
                .environment(catalog)
                .environment(store)
            } else {
                ProgressView()
            }
        }
        .task {
            if store == nil {
                store = PartStore(context: modelContext)
            }
        }
    }
}
