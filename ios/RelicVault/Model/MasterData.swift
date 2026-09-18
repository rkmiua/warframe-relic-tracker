import Foundation

/// バンドルした warframe_data.json をそのまま写した読み取り専用のマスターデータ。
/// 生成は Tools/generate_data.py が行う。
struct MasterData: Decodable {
    var version: Int
    var generatedAt: String
    var relics: [Relic]
    var sets: [PrimeSet]
    var parts: [Part]
}

// MARK: - レリック

enum RelicTier: String, Decodable, CaseIterable, Identifiable, Hashable {
    case lith = "Lith"
    case meso = "Meso"
    case neo = "Neo"
    case axi = "Axi"
    case requiem = "Requiem"
    case vanguard = "Vanguard"

    var id: String { rawValue }
}

/// レリックの精錬段階。報酬確率がこれで変わる。
enum Refinement: String, CaseIterable, Identifiable, Hashable {
    case intact, exceptional, flawless, radiant

    var id: String { rawValue }

    var label: String {
        switch self {
        case .intact: "Intact"
        case .exceptional: "Exceptional"
        case .flawless: "Flawless"
        case .radiant: "Radiant"
        }
    }
}

enum Rarity: String, Decodable, Hashable {
    case common = "Common"
    case uncommon = "Uncommon"
    case rare = "Rare"

    var label: String {
        switch self {
        case .common: "Common"
        case .uncommon: "Uncommon"
        case .rare: "Rare"
        }
    }
}

struct Relic: Decodable, Identifiable, Hashable {
    var id: String          // 例: "Lith A1"
    var tier: RelicTier
    var code: String        // 例: "A1"
    var vaulted: Bool
    var rewards: [Reward]

    struct Reward: Decodable, Hashable {
        var partID: String
        var rarity: Rarity
        var chance: [String: Double]

        func chance(_ refinement: Refinement) -> Double {
            chance[refinement.rawValue] ?? 0
        }
    }
}

// MARK: - Prime セットとパーツ

struct PrimeSet: Decodable, Identifiable, Hashable {
    var id: String          // 例: "Ash Prime"
    var name: String
    var category: String    // Warframes / Primary / Secondary / Melee ...
    var vaulted: Bool
    var partIDs: [String]
}

struct Part: Decodable, Identifiable, Hashable {
    var id: String          // 例: "Ash Prime Systems Blueprint"（レリック報酬名と一致）
    var name: String
    var shortName: String   // 例: "Systems"
    var setID: String?      // Forma などセットに属さない報酬は nil
    var required: Int       // 1セットあたりの必要個数
}
