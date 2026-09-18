import Foundation

/// バンドルしたマスターデータと、そこから組み立てた検索用インデックス。
/// 読み取り専用なので、起動時に一度だけ作る。
@Observable
final class Catalog {
    let relics: [Relic]
    let sets: [PrimeSet]
    let parts: [Part]
    let generatedAt: String

    private let partByID: [String: Part]
    private let setByID: [String: PrimeSet]
    /// パーツ ID → そのパーツが出るレリック（逆引き）
    private let relicsByPartID: [String: [Relic]]
    /// 検索用に小文字化しておいた文字列
    private let relicHaystack: [String: String]
    private let setHaystack: [String: String]

    init(masterData: MasterData) {
        relics = masterData.relics
        sets = masterData.sets
        parts = masterData.parts
        generatedAt = masterData.generatedAt

        partByID = Dictionary(masterData.parts.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        setByID = Dictionary(masterData.sets.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })

        var byPart: [String: [Relic]] = [:]
        for relic in masterData.relics {
            for reward in relic.rewards {
                byPart[reward.partID, default: []].append(relic)
            }
        }
        relicsByPartID = byPart

        // レリックは「Lith A1」でも、そこから出るパーツ名でも引けるようにする
        relicHaystack = Dictionary(uniqueKeysWithValues: masterData.relics.map { relic in
            let rewards = relic.rewards.map(\.partID).joined(separator: " ")
            return (relic.id, "\(relic.id) \(rewards)".lowercased())
        })
        setHaystack = Dictionary(uniqueKeysWithValues: masterData.sets.map { set in
            (set.id, "\(set.name) \(set.category)".lowercased())
        })
    }

    /// アプリにバンドルされた JSON から読み込む。
    static func bundled() throws -> Catalog {
        guard let url = Bundle.main.url(forResource: "warframe_data", withExtension: "json") else {
            throw CatalogError.resourceMissing
        }
        let data = try Data(contentsOf: url)
        return Catalog(masterData: try JSONDecoder().decode(MasterData.self, from: data))
    }

    enum CatalogError: LocalizedError {
        case resourceMissing
        var errorDescription: String? {
            "warframe_data.json がアプリに含まれていません。Tools/generate_data.py を実行してください。"
        }
    }

    // MARK: - 参照

    func part(_ id: String) -> Part? { partByID[id] }
    func set(_ id: String) -> PrimeSet? { setByID[id] }

    /// そのパーツが手に入るレリック。良いものから順に並べる。
    func sources(of partID: String, refinement: Refinement = .radiant) -> [(relic: Relic, chance: Double)] {
        (relicsByPartID[partID] ?? [])
            .map { relic in
                let chance = relic.rewards.first { $0.partID == partID }?.chance(refinement) ?? 0
                return (relic, chance)
            }
            .sorted { $0.chance > $1.chance }
    }

    func parts(of set: PrimeSet) -> [Part] {
        set.partIDs.compactMap { partByID[$0] }
            .sorted { lhs, rhs in
                // 設計図を先頭に、あとは名前順
                let lhsIsBlueprint = lhs.shortName == "Blueprint"
                let rhsIsBlueprint = rhs.shortName == "Blueprint"
                if lhsIsBlueprint != rhsIsBlueprint { return lhsIsBlueprint }
                return lhs.shortName.localizedStandardCompare(rhs.shortName) == .orderedAscending
            }
    }

    // MARK: - 検索

    func searchRelics(_ query: String, tier: RelicTier?, vaultedOnly: Bool) -> [Relic] {
        let needle = query.trimmingCharacters(in: .whitespaces).lowercased()
        return relics.filter { relic in
            if let tier, relic.tier != tier { return false }
            if vaultedOnly, !relic.vaulted { return false }
            guard !needle.isEmpty else { return true }
            return relicHaystack[relic.id]?.contains(needle) ?? false
        }
    }

    func searchSets(_ query: String, category: String?, vaultedOnly: Bool) -> [PrimeSet] {
        let needle = query.trimmingCharacters(in: .whitespaces).lowercased()
        return sets.filter { set in
            if let category, set.category != category { return false }
            if vaultedOnly, !set.vaulted { return false }
            guard !needle.isEmpty else { return true }
            return setHaystack[set.id]?.contains(needle) ?? false
        }
    }

    /// セット横断でパーツ名を直接引く（「Barrel」「Saryn」など）。
    func searchParts(_ query: String) -> [Part] {
        let needle = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !needle.isEmpty else { return [] }
        return parts.filter { $0.id.lowercased().contains(needle) }
            .sorted { $0.id.localizedStandardCompare($1.id) == .orderedAscending }
    }

    var categories: [String] {
        Array(Set(sets.map(\.category))).sorted()
    }
}
