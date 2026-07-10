# LinkNote PWA（iPhone 15／Windows 可用）

這是一個不需要 Mac 或 Xcode 的 Obsidian 風格筆記 App。

## 已完成

- Markdown 編輯與預覽
- `[[雙向連結]]`
- 反向連結
- `#標籤`
- 全文搜尋
- 置頂、刪除、自動儲存
- 關聯圖譜
- JSON 備份／還原
- Markdown 匯出
- PWA 離線快取
- iPhone 15 安全區與行動版介面

## 重要：不能直接雙擊 index.html 安裝

PWA 必須放到 HTTPS 網站。最簡單方法如下。

## 方法一：GitHub Pages（免費）

1. 在 GitHub 建立新的 Repository，例如 `linknote`。
2. 將本資料夾內的所有檔案上傳到 Repository 根目錄。
3. 進入 Repository 的 Settings → Pages。
4. Source 選擇 `Deploy from a branch`。
5. Branch 選擇 `main` 與 `/ (root)`，按 Save。
6. 等 GitHub 顯示網站網址後，用 iPhone Safari 開啟。
7. Safari 分享 → 加入主畫面。

## 方法二：Netlify Drop（免費且較簡單）

1. 在 Windows 解壓縮本專案。
2. 開啟 Netlify Drop 網頁。
3. 把整個 `LinkNote-PWA-iPhone15` 資料夾拖進去。
4. 取得 HTTPS 網址後，用 iPhone Safari 開啟。
5. Safari 分享 → 加入主畫面。

## 資料保存提醒

筆記保存在瀏覽器的 localStorage 中：

- 不會自動上傳到伺服器。
- 清除 Safari 網站資料可能會刪除筆記。
- 建議定期從「設定與備份」匯出 JSON 備份。
- 不同裝置之間目前不會自動同步。

## 本機測試（Windows）

已安裝 Python 時，在此資料夾開啟 PowerShell：

```powershell
python -m http.server 8000
```

接著在電腦瀏覽器開啟：

```text
http://localhost:8000
```

本機測試可使用功能，但在 iPhone 安裝仍應使用 HTTPS 網址。
