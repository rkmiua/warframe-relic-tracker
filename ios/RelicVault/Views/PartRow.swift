import SwiftUI

/// 所持状態を切り替えるボタン。行の中で使うので `.borderless` にして、
/// 行そのもののタップ（詳細への遷移）と衝突しないようにしている。
struct PartStatusButton: View {
    let partID: String
    @Environment(PartStore.self) private var store

    var body: some View {
        let status = store.status(of: partID)
        Button {
            store.advance(partID)
        } label: {
            Image(systemName: status.symbolName)
                .font(.title3)
                .foregroundStyle(status.tint)
                .contentTransition(.symbolEffect(.replace))
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("\(partID) の状態")
        .accessibilityValue(status.label)
        .accessibilityHint("タップで 未所持・所持中・作成済み を切り替えます")
    }
}

/// 一覧に並べるパーツ 1 行。
struct PartRow: View {
    let part: Part
    var rarity: Rarity?
    var chanceText: String?
    /// セット名まで出すか（横断検索など、どのセットのパーツか分からない場面で使う）
    var showsSetName = false

    @Environment(PartStore.self) private var store

    var body: some View {
        HStack(spacing: 12) {
            if let rarity {
                RarityDot(rarity: rarity)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(showsSetName ? part.id : part.shortName)
                    if part.required > 1 {
                        Text("×\(part.required)")
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(.tertiary, in: .capsule)
                    }
                }
                if let chanceText {
                    Text(chanceText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }

            Spacer(minLength: 8)
            PartStatusButton(partID: part.id)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                store.setStatus(.crafted, for: part.id)
            } label: {
                Label("作成済み", systemImage: PartStatus.crafted.symbolName)
            }
            .tint(PartStatus.crafted.tint)

            Button {
                store.setStatus(.owned, for: part.id)
            } label: {
                Label("所持中", systemImage: PartStatus.owned.symbolName)
            }
            .tint(PartStatus.owned.tint)
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                store.setStatus(.notOwned, for: part.id)
            } label: {
                Label("未所持", systemImage: PartStatus.notOwned.symbolName)
            }
        }
    }
}
