import SwiftUI

struct SetDetailView: View {
    let set: PrimeSet

    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store

    var body: some View {
        let parts = catalog.parts(of: set)
        let progress = store.progress(for: set.partIDs)

        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("作成済み")
                        Spacer()
                        Text("\(progress.crafted) / \(progress.total)")
                            .monospacedDigit()
                            .foregroundStyle(progress.isComplete ? .green : .primary)
                    }
                    .font(.subheadline)

                    Gauge(value: progress.fraction) { EmptyView() }
                        .gaugeStyle(.linearCapacity)
                        .tint(progress.isComplete ? .green : .accentColor)

                    Text(progress.isComplete
                         ? "コンプリート"
                         : "所持中 \(progress.owned) · 未所持 \(progress.total - progress.collected)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 6)
            }

            Section("パーツ") {
                ForEach(parts) { part in
                    NavigationLink(value: part) {
                        PartRow(part: part)
                    }
                }
            }

            Section {
                Button("すべて作成済みにする", systemImage: "checkmark.circle.fill") {
                    for id in set.partIDs { store.setStatus(.crafted, for: id) }
                }
                Button("すべて未所持に戻す", systemImage: "arrow.uturn.backward", role: .destructive) {
                    for id in set.partIDs { store.setStatus(.notOwned, for: id) }
                }
            }
        }
        .navigationTitle(set.name)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Part.self) { PartDetailView(part: $0) }
        .navigationDestination(for: Relic.self) { RelicDetailView(relic: $0) }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if set.vaulted {
                    Label("Vaulted", systemImage: "lock.fill")
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
