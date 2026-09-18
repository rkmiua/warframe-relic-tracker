import Foundation
import SwiftData

/// パーツの所持状態を読み書きする窓口。
///
/// 596 パーツ分を毎回フェッチすると画面がもたつくので、メモリ上に写しを持ち、
/// 変更があったときだけ SwiftData に書き戻す。
@MainActor
@Observable
final class PartStore {
    private let context: ModelContext
    private var records: [String: PartRecord] = [:]

    init(context: ModelContext) {
        self.context = context
        reload()
    }

    private func reload() {
        let fetched = (try? context.fetch(FetchDescriptor<PartRecord>())) ?? []
        records = [:]
        for record in fetched {
            // CloudKit 同期を入れると一意制約が使えないため、重複は新しい方を残して畳む
            if let existing = records[record.partID] {
                if record.updatedAt > existing.updatedAt {
                    records[record.partID] = record
                    context.delete(existing)
                } else {
                    context.delete(record)
                }
            } else {
                records[record.partID] = record
            }
        }
    }

    func status(of partID: String) -> PartStatus {
        records[partID]?.status ?? .notOwned
    }

    func setStatus(_ status: PartStatus, for partID: String) {
        if let record = records[partID] {
            guard record.status != status else { return }
            record.status = status
        } else {
            guard status != .notOwned else { return }   // 未所持はレコードを作らない
            let record = PartRecord(partID: partID, status: status)
            records[partID] = record
            context.insert(record)
        }
        try? context.save()
    }

    /// タップで 未所持 → 所持中 → 作成済み と送る。
    func advance(_ partID: String) {
        setStatus(status(of: partID).next, for: partID)
    }

    // MARK: - 集計

    struct Progress {
        var crafted: Int
        var owned: Int
        var total: Int

        var collected: Int { crafted + owned }
        var isComplete: Bool { total > 0 && crafted == total }
        var fraction: Double { total == 0 ? 0 : Double(crafted) / Double(total) }
    }

    func progress(for partIDs: [String]) -> Progress {
        var crafted = 0
        var owned = 0
        for id in partIDs {
            switch status(of: id) {
            case .crafted: crafted += 1
            case .owned: owned += 1
            case .notOwned: break
            }
        }
        return Progress(crafted: crafted, owned: owned, total: partIDs.count)
    }

    /// 所持状態を記録しているパーツの総数（設定画面の表示用）。
    var trackedPartCount: Int {
        records.values.count { $0.status != .notOwned }
    }

    func resetAll() {
        for record in records.values {
            context.delete(record)
        }
        records = [:]
        try? context.save()
    }
}
