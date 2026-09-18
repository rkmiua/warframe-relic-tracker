import SwiftUI

struct PartDetailView: View {
    let part: Part

    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store
    @State private var refinement: Refinement = .intact

    var body: some View {
        List {
            Section("状態") {
                Picker("状態", selection: statusBinding) {
                    ForEach(PartStatus.allCases) { status in
                        Text(status.label).tag(status)
                    }
                }
                .pickerStyle(.segmented)

                if part.required > 1 {
                    LabeledContent("必要数", value: "\(part.required) 個")
                }
            }

            if let setID = part.setID, let set = catalog.set(setID) {
                Section("セット") {
                    NavigationLink(value: set) {
                        SetSummaryRow(set: set)
                    }
                }
            }

            Section {
                Picker("精錬", selection: $refinement) {
                    ForEach(Refinement.allCases) { state in
                        Text(state.label).tag(state)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(.init(top: 4, leading: 0, bottom: 4, trailing: 0))

                ForEach(sources, id: \.relic.id) { source in
                    NavigationLink(value: source.relic) {
                        HStack {
                            TierBadge(tier: source.relic.tier)
                            Text(source.relic.id)
                            if source.relic.vaulted {
                                Image(systemName: "lock.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(source.chance.formatted(.number.precision(.fractionLength(0...2))) + "%")
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } header: {
                Text("入手できるレリック (\(sources.count))")
            } footer: {
                Text("確率の高い順に並んでいます。")
            }
        }
        .navigationTitle(part.id)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Relic.self) { RelicDetailView(relic: $0) }
        .navigationDestination(for: PrimeSet.self) { SetDetailView(set: $0) }
    }

    private var sources: [(relic: Relic, chance: Double)] {
        catalog.sources(of: part.id, refinement: refinement)
    }

    private var statusBinding: Binding<PartStatus> {
        Binding(
            get: { store.status(of: part.id) },
            set: { store.setStatus($0, for: part.id) }
        )
    }
}

/// セットの名前と進捗をまとめた行。一覧でも詳細でも使う。
struct SetSummaryRow: View {
    let set: PrimeSet
    @Environment(PartStore.self) private var store

    var body: some View {
        let progress = store.progress(for: set.partIDs)
        HStack(spacing: 12) {
            Image(systemName: progress.isComplete ? "checkmark.seal.fill" : "square.grid.2x2")
                .foregroundStyle(progress.isComplete ? .green : .secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(set.name)
                HStack(spacing: 6) {
                    Text(set.category)
                    if set.vaulted {
                        Text("· Vaulted")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(progress.crafted)/\(progress.total)")
                .font(.callout)
                .monospacedDigit()
                .foregroundStyle(progress.isComplete ? .green : .secondary)
        }
    }
}
