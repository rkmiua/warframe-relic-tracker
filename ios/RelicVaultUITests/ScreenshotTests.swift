import XCTest

/// 画面の見た目を確認するためのスクリーンショット採取。
/// 検証そのものは RelicVaultUITests 側で行う。
final class ScreenshotTests: XCTestCase {

    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func launch(tab: Int) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-selectedTab", "\(tab)"]
        app.launch()
        return app
    }

    func testCaptureRelicScreens() {
        let app = launch(tab: 0)
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        capture(app, "01-relic-list")

        search.tap()
        search.typeText("Saryn")
        XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 5))
        capture(app, "02-relic-search-by-part")

        // 改行で検索を確定してキーボードを閉じないと、セルがキーボードに隠れてタップできない
        search.typeText("\n")
        let relic = app.cells.staticTexts["Lith A1"]
        XCTAssertTrue(relic.waitForExistence(timeout: 5))
        relic.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態")).firstMatch.waitForExistence(timeout: 5))
        // 状態をいくつか変えて、見た目の差が分かるようにする
        let statuses = app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態"))
        if statuses.count >= 3 {
            statuses.element(boundBy: 0).tap()
            statuses.element(boundBy: 1).tap()
            statuses.element(boundBy: 1).tap()
        }
        capture(app, "03-relic-detail")

        // 報酬行から パーツ詳細（入手できるレリック一覧）へ
        app.cells.staticTexts["Saryn Prime Neuroptics Blueprint"].tap()
        XCTAssertTrue(app.navigationBars["Saryn Prime Neuroptics Blueprint"].waitForExistence(timeout: 5))
        capture(app, "04-part-detail")
    }

    func testCapturePrimeScreens() {
        let app = launch(tab: 1)
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        capture(app, "05-set-list")

        search.tap()
        search.typeText("Saryn Prime\n")
        let cell = app.cells.staticTexts["Saryn Prime"]
        XCTAssertTrue(cell.waitForExistence(timeout: 5))
        cell.tap()
        XCTAssertTrue(app.navigationBars["Saryn Prime"].waitForExistence(timeout: 5))

        let statuses = app.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "の状態"))
        if statuses.count >= 3 {
            statuses.element(boundBy: 0).tap()
            statuses.element(boundBy: 0).tap()
            statuses.element(boundBy: 1).tap()
        }
        capture(app, "06-set-detail")
    }

    func testCaptureSearchTab() {
        let app = launch(tab: 2)
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        capture(app, "07-part-search-empty")
        search.tap()
        search.typeText("Barrel")
        XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 5))
        capture(app, "08-part-search-results")
    }
}
