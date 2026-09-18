import SwiftUI

/// セットをまたいでパーツ名を直接引く画面。
/// 「Barrel が足りないのはどれか」「Saryn 関連で未所持は何か」を見るのに使う。
struct PartSearchView: View {
    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store

    @State private var query = ""
    @State private var hidesOwned = false

    private var results: [Part] {
        let matched = catalog.searchParts(query)
        return hidesOwned ? matched.filter { store.status(of: $0.id) == .notOwned } : matched
    }

    var body: some View {
        NavigationStack {
            List {
                if !results.isEmpty {
                    Section {
                        ForEach(results) { part in
                            NavigationLink(value: part) {
                                PartRow(part: part, showsSetName: true)
                            }
                        }
                    } header: {
                        Text("\(results.count) 件")
                    }
                }
            }
            .navigationTitle("パーツ検索")
            .navigationDestination(for: Part.self) { PartDetailView(part: $0) }
            .navigationDestination(for: Relic.self) { RelicDetailView(relic: $0) }
            .navigationDestination(for: PrimeSet.self) { SetDetailView(set: $0) }
            .searchable(text: $query, prompt: "パーツ名（例: Saryn, Barrel）")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Toggle(isOn: $hidesOwned) {
                        Label("未所持のみ", systemImage: hidesOwned ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    }
                    .toggleStyle(.button)
                    .labelStyle(.iconOnly)
                }
            }
            .overlay {
                if query.isEmpty {
                    ContentUnavailableView(
                        "パーツを検索",
                        systemImage: "magnifyingglass",
                        description: Text("Prime の名前やパーツ名で、全 \(catalog.parts.count) 種類から探せます。")
                    )
                } else if results.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
        }
    }
}
