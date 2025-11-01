# クイックスタートガイド

## 1. セットアップ（5分）

### 依存関係インストール

```bash
cd /Users/remma/project/researchagent
npm install
```

### 環境変数設定

```bash
cp .env.example .env
```

`.env` ファイルを編集し、OpenAI API Keyを設定：

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
CONCURRENCY=6
PER_QUERY_LIMIT=20
```

### ビルド

```bash
npm run build
```

## 2. 実行（テスト実行）

### 小規模テスト（5件程度）

```bash
npm run dev -- --phase 1 --target-rows 10 --per-query 5 --out-prefix test_run
```

**実行時間**: 約3-5分
**期待結果**: `output/test_run_*.md`, `output/test_run_*.csv` 等が生成される

### フル実行（フェーズ1: 100-120件）

```bash
npm run dev -- --phase 1 --target-rows 120 --out-prefix n8n_phase1
```

**実行時間**: 約15-25分
**期待結果**: 100件以上のn8n事例が収集される

### フェーズ2（4業種特化）

```bash
npm run dev -- --phase 2 --target-rows 100 --focus realestate,hotel,restaurant,night --out-prefix n8n_phase2
```

## 3. 出力確認

```bash
ls -lh output/
```

以下のファイルが生成されます：

- `{prefix}_full.md` - Markdown表＋直後CSV（50行分割）
- `{prefix}_full.csv` - 全件CSV
- `{prefix}_pivots.md` - ピボット集計
- `{prefix}_topROI.md` - ROI上位20件
- `{prefix}_focus.md` - フェーズ2専用（4業種のみ）
- `{prefix}_log.jsonl` - 監査ログ

### 簡易プレビュー

```bash
# Markdown表示（先頭50行）
head -50 output/test_run_full.md

# CSV確認
head -10 output/test_run_full.csv

# ピボット集計
cat output/test_run_pivots.md

# ROI上位
cat output/test_run_topROI.md
```

## 4. カスタマイズ

### 検索クエリ追加

`config/queries.json` を編集：

```json
{
  "jp": [
    "n8n 事例",
    "n8n 導入事例",
    "n8n 予約システム",  ← 追加
    "n8n PMS連携"        ← 追加
  ],
  "en": [
    "n8n case study",
    "n8n hotel automation",  ← 追加
    "n8n restaurant POS"     ← 追加
  ]
}
```

### 優先ドメイン追加

`config/domains.json` を編集：

```json
{
  "priority": [
    "n8n.io",
    "community.n8n.io",
    "your-trusted-domain.com"  ← 追加
  ]
}
```

## 5. トラブルシューティング

### 問題: 検索結果が少ない

**原因**: DuckDuckGo検索の結果が限定的

**対策**:
- `--per-query` を増やす（例: 30）
- 検索クエリを追加（`config/queries.json`）
- 並列数を増やす `--concurrency 10`

### 問題: LLM抽出エラー

**原因**: OpenAI APIレート制限または認証エラー

**対策**:
```bash
# API Keyを確認
echo $OPENAI_API_KEY

# 並列数を減らす
npm run dev -- --phase 1 --target-rows 10 --concurrency 3
```

### 問題: タイムアウトエラー

**原因**: ネットワーク遅延またはサイトの応答遅延

**対策**:
- 自動リトライが働くため、通常は問題なし
- ログ（`output/*_log.jsonl`）で失敗URLを確認

### 問題: メモリ不足

**原因**: 大量の並列処理

**対策**:
```bash
# 並列数を減らす
npm run dev -- --phase 1 --target-rows 120 --concurrency 3
```

## 6. 本番実行推奨設定

```bash
# フェーズ1（産業横断）
npm run dev -- \
  --phase 1 \
  --target-rows 150 \
  --concurrency 6 \
  --per-query 20 \
  --out-prefix n8n_production_phase1

# フェーズ2（4業種特化）
npm run dev -- \
  --phase 2 \
  --target-rows 100 \
  --focus realestate,hotel,restaurant,night \
  --concurrency 6 \
  --per-query 20 \
  --out-prefix n8n_production_phase2
```

**推定実行時間**:
- フェーズ1（150件目標）: 約20-30分
- フェーズ2（100件目標）: 約15-25分

**推定コスト**:
- OpenAI API（gpt-4o-mini）: 約$2-5（150件の場合）

## 7. 次のステップ

### 定期実行（cron）

```bash
# 毎週月曜9時に実行
0 9 * * 1 cd /Users/remma/project/researchagent && npm start -- --phase 1 --target-rows 120 --out-prefix weekly_$(date +\%Y\%m\%d)
```

### n8nワークフロー化

要件定義に基づき、n8nネイティブ版の実装も可能です：
- HTTP Requestノード（DuckDuckGo検索）
- HTTP Requestノード（HTML取得）
- Codeノード（本文抽出・正規化）
- OpenAI/Claudeノード（LLM抽出）
- Google Sheets/Notion/Airtableノード（出力）

### 出力先拡張

- Notion Database連携
- Airtable連携
- Google Sheets連携
- BigQuery連携（データウェアハウス）

## 8. ヘルプ

```bash
npm run dev -- --help
```

問題が解決しない場合は、[README.md](README.md) または issue を参照してください。
