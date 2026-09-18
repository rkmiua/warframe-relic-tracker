import SwiftUI

struct RelicListView: View {
    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store

    @State private var query = ""
    @State private var tier: RelicTier?
    @State private var vaultedOnly = false

    private var results: [Relic] {
        catalog.searchRelics(query, tier: tier, vaultedOnly: vaultedOnly)
    }

    var body: some View {
        NavigationStack {
            List {
                if !results.isEmpty {
                    Section {
                        ForEach(results) { relic in
                            NavigationLink(value: relic) {
                                RelicRow(relic: relic)
                            }
                        }
                    } header: {
                        Text("\(results.count) 件")
                    }
                }
            }
            .navigationTitle("レリック")
            .navigationDestination(for: Relic.self) { RelicDetailView(relic: $0) }
            .searchable(text: $query, prompt: "レリック名・報酬パーツ名")
            .overlay {
                if results.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterMenu
                }
            }
        }
    }

    private var filterMenu: some View {
        Menu {
            Picker("層", selection: $tier) {
                Text("すべての層").tag(RelicTier?.none)
                ForEach(RelicTier.allCases) { tier in
                    Text(tier.rawValue).tag(RelicTier?.some(tier))
                }
            }
            Toggle("Vaulted のみ", isOn: $vaultedOnly)
        } label: {
            Label("絞り込み", systemImage: tier == nil && !vaultedOnly
                  ? "line.3.horizontal.decrease.circle"
                  : "line.3.horizontal.decrease.circle.fill")
        }
    }
}

private struct RelicRow: View {
    let relic: Relic
    @Environment(PartStore.self) private var store

    var body: some View {
        let progress = store.progress(for: relic.rewards.map(\.partID))
        HStack(spacing: 12) {
            TierBadge(tier: relic.tier)
            VStack(alignment: .leading, spacing: 2) {
                Text(relic.id)
                    .font(.body)
                if relic.vaulted {
                    VaultedBadge()
                }
            }
            Spacer()
            // 報酬 6 枠のうち、まだ手に入れていない数を出す。開ける価値の目安になる。
            let missing = progress.total - progress.collected
            Text(missing == 0 ? "すべて所持" : "未所持 \(missing)")
                .font(.caption)
                .monospacedDigit()
                .foregroundStyle(missing == 0 ? .green : .secondary)
        }
    }
}
