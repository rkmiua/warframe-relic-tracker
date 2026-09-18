import SwiftUI

struct SetListView: View {
    enum SortOrder: String, CaseIterable, Identifiable {
        case name = "名前順"
        case progress = "完成が近い順"
        var id: String { rawValue }
    }

    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store

    @State private var query = ""
    @State private var category: String?
    @State private var vaultedOnly = false
    @State private var sortOrder: SortOrder = .name
    @State private var isShowingResetConfirmation = false

    private var results: [PrimeSet] {
        let matched = catalog.searchSets(query, category: category, vaultedOnly: vaultedOnly)
        switch sortOrder {
        case .name:
            return matched
        case .progress:
            return matched.sorted { lhs, rhs in
                let l = store.progress(for: lhs.partIDs)
                let r = store.progress(for: rhs.partIDs)
                // 完成済みは末尾へ、あとは残りが少ない順
                if l.isComplete != r.isComplete { return !l.isComplete }
                let lRemaining = l.total - l.crafted
                let rRemaining = r.total - r.crafted
                if lRemaining != rRemaining { return lRemaining < rRemaining }
                if l.collected != r.collected { return l.collected > r.collected }
                return lhs.name.localizedStandardCompare(rhs.name) == .orderedAscending
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if !results.isEmpty {
                    Section {
                        ForEach(results) { set in
                            NavigationLink(value: set) {
                                SetSummaryRow(set: set)
                            }
                        }
                    } header: {
                        Text("\(results.count) セット")
                    }
                }
            }
            .navigationTitle("Prime")
            .navigationDestination(for: PrimeSet.self) { SetDetailView(set: $0) }
            .navigationDestination(for: Part.self) { PartDetailView(part: $0) }
            .navigationDestination(for: Relic.self) { RelicDetailView(relic: $0) }
            .searchable(text: $query, prompt: "セット名・カテゴリ")
            .overlay {
                if results.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { filterMenu }
                ToolbarItem(placement: .topBarLeading) { settingsMenu }
            }
            .confirmationDialog(
                "記録した所持状態をすべて消去しますか？",
                isPresented: $isShowingResetConfirmation,
                titleVisibility: .visible
            ) {
                Button("すべて消去", role: .destructive) { store.resetAll() }
                Button("キャンセル", role: .cancel) { }
            } message: {
                Text("この操作は取り消せません。")
            }
        }
    }

    private var filterMenu: some View {
        Menu {
            Picker("並び替え", selection: $sortOrder) {
                ForEach(SortOrder.allCases) { Text($0.rawValue).tag($0) }
            }
            Divider()
            Picker("カテゴリ", selection: $category) {
                Text("すべて").tag(String?.none)
                ForEach(catalog.categories, id: \.self) { name in
                    Text(name).tag(String?.some(name))
                }
            }
            Toggle("Vaulted のみ", isOn: $vaultedOnly)
        } label: {
            Label("絞り込み", systemImage: category == nil && !vaultedOnly && sortOrder == .name
                  ? "line.3.horizontal.decrease.circle"
                  : "line.3.horizontal.decrease.circle.fill")
        }
    }

    private var settingsMenu: some View {
        Menu {
            Section("データ") {
                Text("更新日 \(catalog.generatedAt)")
                Text("レリック \(catalog.relics.count) / パーツ \(catalog.parts.count)")
            }
            Section("記録") {
                Text("記録済み \(store.trackedPartCount) パーツ")
                Button("所持状態をすべて消去", systemImage: "trash", role: .destructive) {
                    isShowingResetConfirmation = true
                }
            }
        } label: {
            Label("情報", systemImage: "ellipsis.circle")
        }
    }
}
