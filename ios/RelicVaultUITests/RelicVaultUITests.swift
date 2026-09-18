import XCTest

final class RelicVaultUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(tab: Int) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-selectedTab", "\(tab)"]
        app.launch()
        return app
    }

    /// レリックの検索と、報酬一覧への遷移。
    func testSearchAndOpenRelic() {
        let app = launch(tab: 0)

        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10), "検索フィールドが出ない")
        search.tap()
        search.typeText("Lith A1")

        let cell = app.cells.staticTexts["Lith A1"]
        XCTAssertTrue(cell.waitForExistence(timeout: 5), "検索結果に Lith A1 が出ない")
        cell.tap()

        XCTAssertTrue(app.navigationBars["Lith A1"].waitForExistence(timeout: 5), "レリック詳細に遷移しない")
        // 報酬は 6 枠
        let statusButtons = app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態"))
        XCTAssertEqual(statusButtons.count, 6, "報酬が 6 件表示されていない")
    }

    /// 肝心なところ: 行の中の状態ボタンを押したとき、
    /// 画面遷移せずに 未所持 → 所持中 → 作成済み と切り替わること。
    func testStatusButtonCyclesWithoutNavigating() {
        let app = launch(tab: 0)

        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("Lith A1")
        app.cells.staticTexts["Lith A1"].tap()
        XCTAssertTrue(app.navigationBars["Lith A1"].waitForExistence(timeout: 5))

        let button = app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態")).firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 5), "状態ボタンが見つからない")

        let order = ["未所持", "所持中", "作成済み"]
        guard let start = order.firstIndex(of: button.value as? String ?? "") else {
            return XCTFail("状態の初期値が読めない: \(String(describing: button.value))")
        }

        for step in 1...3 {
            button.tap()
            let expected = order[(start + step) % order.count]
            XCTAssertTrue(
                app.staticTexts.firstMatch.waitForExistence(timeout: 2),
                "画面が反応しない"
            )
            XCTAssertEqual(button.value as? String, expected, "\(step) 回目のタップで状態が \(expected) にならない")
            // ボタンを押しただけで詳細画面へ飛んでしまっていないこと
            XCTAssertTrue(app.navigationBars["Lith A1"].exists, "状態ボタンのタップで画面が遷移してしまった")
        }
    }

    /// 記録した状態がアプリを再起動しても残ること。
    func testStatusPersistsAcrossLaunches() {
        let app = launch(tab: 0)
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap()
        search.typeText("Lith A1")
        app.cells.staticTexts["Lith A1"].tap()

        let button = app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態")).firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        let label = button.label
        button.tap()
        let recorded = button.value as? String
        XCTAssertNotNil(recorded)

        app.terminate()
        let relaunched = launch(tab: 0)
        let search2 = relaunched.searchFields.firstMatch
        XCTAssertTrue(search2.waitForExistence(timeout: 10))
        search2.tap()
        search2.typeText("Lith A1")
        relaunched.cells.staticTexts["Lith A1"].tap()

        let sameButton = relaunched.buttons[label]
        XCTAssertTrue(sameButton.waitForExistence(timeout: 5), "再起動後に同じ行が見つからない")
        XCTAssertEqual(sameButton.value as? String, recorded, "再起動で所持状態が失われた")
    }

    /// Prime セット側: まとめて作成済みにすると進捗が満たされること。
    func testMarkWholeSetAsCrafted() {
        let app = launch(tab: 1)

        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Prime タブの検索フィールドが出ない")
        search.tap()
        search.typeText("Ash Prime")

        let cell = app.cells.staticTexts["Ash Prime"]
        XCTAssertTrue(cell.waitForExistence(timeout: 5), "Ash Prime が見つからない")
        cell.tap()
        XCTAssertTrue(app.navigationBars["Ash Prime"].waitForExistence(timeout: 5))

        app.buttons["すべて未所持に戻す"].tap()
        app.buttons["すべて作成済みにする"].tap()

        XCTAssertTrue(
            app.staticTexts["コンプリート"].waitForExistence(timeout: 5),
            "全パーツを作成済みにしてもコンプリート表示にならない"
        )
    }
}
