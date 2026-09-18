import SwiftUI

extension RelicTier {
    var tint: Color {
        switch self {
        case .lith: .brown
        case .meso: .gray
        case .neo: .yellow
        case .axi: .blue
        case .requiem: .purple
        case .vanguard: .teal
        }
    }
}

extension Rarity {
    var tint: Color {
        switch self {
        case .common: .brown
        case .uncommon: .gray
        case .rare: .yellow
        }
    }
}

extension PartStatus {
    var tint: Color {
        switch self {
        case .notOwned: .secondary
        case .owned: .orange
        case .crafted: .green
        }
    }
}

/// レリックの層を表す小さな丸アイコン。
struct TierBadge: View {
    let tier: RelicTier
    var body: some View {
        Image(systemName: "shippingbox.fill")
            .foregroundStyle(tier.tint)
            .accessibilityLabel(tier.rawValue)
    }
}

/// 禁庫入り（Vaulted）を示すラベル。
struct VaultedBadge: View {
    var body: some View {
        Label("Vaulted", systemImage: "lock.fill")
            .font(.caption2)
            .labelStyle(.titleAndIcon)
            .foregroundStyle(.secondary)
    }
}

/// レア度を表す点。
struct RarityDot: View {
    let rarity: Rarity
    var body: some View {
        Image(systemName: "circle.fill")
            .font(.system(size: 8))
            .foregroundStyle(rarity.tint)
            .accessibilityLabel(rarity.label)
    }
}

extension PartStore.Progress {
    /// 「3/4 作成済み」のような表示用の文字列。
    var summary: String {
        if isComplete { return "コンプリート" }
        return "\(crafted)/\(total) 作成済み"
    }
}
