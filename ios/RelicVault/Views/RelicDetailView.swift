import SwiftUI

struct RelicDetailView: View {
    let relic: Relic

    @Environment(Catalog.self) private var catalog
    @Environment(PartStore.self) private var store
    @State private var refinement: Refinement = .intact

    var body: some View {
        List {
            Section {
                Picker("精錬", selection: $refinement) {
                    ForEach(Refinement.allCases) { state in
                        Text(state.label).tag(state)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(.init(top: 4, leading: 0, bottom: 4, trailing: 0))
            }

            Section("報酬") {
                ForEach(relic.rewards, id: \.partID) { reward in
                    if let part = catalog.part(reward.partID) {
                        NavigationLink(value: part) {
                            PartRow(
                                part: part,
                                rarity: reward.rarity,
                                chanceText: "\(reward.rarity.label) · \(formatted(reward.chance(refinement)))",
                                showsSetName: true
                            )
                        }
                    }
                }
            }
        }
        .navigationTitle(relic.id)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Part.self) { PartDetailView(part: $0) }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if relic.vaulted {
                    Label("Vaulted", systemImage: "lock.fill")
                        .labelStyle(.iconOnly)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func formatted(_ chance: Double) -> String {
        chance.formatted(.number.precision(.fractionLength(0...2))) + "%"
    }
}
