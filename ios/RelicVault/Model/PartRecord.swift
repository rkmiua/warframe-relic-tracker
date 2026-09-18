import Foundation
import SwiftData

/// パーツの所持状態。
/// 生値で保存しているのは、後から CloudKit 同期を有効にしても
/// スキーマを作り直さずに済むようにするため。
enum PartStatus: Int, CaseIterable, Identifiable, Hashable {
    case notOwned = 0
    case owned = 1
    case crafted = 2

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .notOwned: "未所持"
        case .owned: "所持中"
        case .crafted: "作成済み"
        }
    }

    var symbolName: String {
        switch self {
        case .notOwned: "circle"
        case .owned: "circle.lefthalf.filled"
        case .crafted: "checkmark.circle.fill"
        }
    }

    /// タップするたびに 未所持 → 所持中 → 作成済み → 未所持 と巡回する。
    var next: PartStatus {
        switch self {
        case .notOwned: .owned
        case .owned: .crafted
        case .crafted: .notOwned
        }
    }
}

/// ユーザーが持っている状態だけを保存する。マスターデータ側は一切書き換えない。
///
/// CloudKit 同期へ移行できるよう、全プロパティにデフォルト値を与え、
/// `@Attribute(.unique)` は使っていない（CloudKit が一意制約を扱えないため）。
/// 同じ partID のレコードが二重に作られないことは `PartStore` 側で担保する。
@Model
final class PartRecord {
    var partID: String = ""
    var statusValue: Int = PartStatus.notOwned.rawValue
    var updatedAt: Date = Date.distantPast

    var status: PartStatus {
        get { PartStatus(rawValue: statusValue) ?? .notOwned }
        set {
            statusValue = newValue.rawValue
            updatedAt = .now
        }
    }

    init(partID: String, status: PartStatus = .notOwned) {
        self.partID = partID
        self.statusValue = status.rawValue
        self.updatedAt = .now
    }
}
