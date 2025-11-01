# n8n Research Agent

n8n事例を自動収集し、構造化されたMarkdown表・CSV・ピボット集計・ROI上位表を生成するリサーチエージェント。

## 特徴

- **全自動収集**: Web検索 → クロール → LLM抽出 → 出力まで完全自動化
- **20列スキーマ**: 業種・KPI・n8nノード・ROI等を体系的に抽出
- **事実ベース原則**: 本文に明記された情報のみ抽出、推定は明示
- **優先ドメイン対応**: 公式サイト・コミュニティを優先的に収集
- **重複排除**: 組織/製品/ユースケース/出典でユニーク化
- **多様な出力**: Markdown表＋CSV、ピボット集計、ROI上位20件

## 必要環境

- Node.js 18以上
- OpenAI API Key（または Anthropic Claude API）

## インストール

```bash
# 依存関係インストール
npm install

# .envファイル作成
cp .env.example .env

# .envにAPIキーを設定
# OPENAI_API_KEY=your_api_key_here
```

## 使い方

### フェーズ1（産業横断）

```bash
npm run dev -- --phase 1 --target-rows 120 --out-prefix n8n_phase1
```

### フェーズ2（4業種特化）

```bash
npm run dev -- --phase 2 --target-rows 100 --focus realestate,hotel,restaurant,night --out-prefix n8n_phase2
```

### オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--phase` | フェーズ（1 or 2） | 1 |
| `--target-rows` | 目標件数 | 120 |
| `--focus` | フェーズ2用業種（カンマ区切り） | - |
| `--out-prefix` | 出力ファイル接頭辞 | n8n_phase1 |
| `--concurrency` | 並列処理数 | 6 |
| `--per-query` | 1クエリあたりの最大取得件数 | 20 |

## 出力ファイル

実行後、`output/` ディレクトリに以下が生成されます：

- `{prefix}_full.md` - 50行ごとのMarkdown表＋直後CSV
- `{prefix}_full.csv` - 全件CSV
- `{prefix}_pivots.md` - ピボット集計（業種別・トリガー別・情報種別）
- `{prefix}_topROI.md` - ROI上位20件
- `{prefix}_focus.md` - フェーズ2専用（4業種のみ）
- `{prefix}_log.jsonl` - 監査ログ（JSONL形式）

## 20列スキーマ

| 列名 | 説明 |
|-----|------|
| ID | 3桁ゼロパディング（001, 002, ...） |
| タイトル | 事例名 |
| 業種 | 不動産/ホテル/飲食/ナイト/EC・小売/医療・ヘルスケア等 |
| サブ領域 | 予約管理、在庫、PMS/OTA、POS、CRM等 |
| 目的/KPI | 数値があれば含む（例: 工数50%削減） |
| トリガー種別 | Webhook/Cron/IMAP/API等（複数可、"/"区切り） |
| 入力ソース | SaaS/DB/ファイル/フォーム名 |
| 出力先 | SaaS/DB/通知/シート/BI |
| 主要n8nノード | 3-10個（例: Webhook, HTTP Request, Code, Slack） |
| 外部API/連携ツール | 固有名詞（例: Shopify, Airtable, Notion） |
| ワークフロー概要 | 150字程度 |
| 実装難易度 | 1-5（1=単純、5=複雑） |
| 規模目安 | 頻度/件数/店舗等 |
| 成果/ROI | 定量優先、なければ定性 |
| 運用上のリスク/前提 | 認証、レート制限、監視要件等 |
| 地域/言語 | JP/日本語、Global/英語等 |
| 出典URL | 事例のURL |
| 情報の種類 | 一次情報/二次情報/推定 |
| 公開日/更新日 | YYYY-MM-DD形式 |
| 重複判定キー | <組織/製品/ユースケース/出典ドメイン> |

## カスタマイズ

### 検索クエリ変更

[config/queries.json](config/queries.json) を編集：

```json
{
  "jp": ["n8n 事例", "n8n 導入事例", ...],
  "en": ["n8n case study", "n8n workflow automation", ...]
}
```

### 優先ドメイン追加

[config/domains.json](config/domains.json) を編集：

```json
{
  "priority": ["n8n.io", "community.n8n.io", "qiita.com", ...],
  "blocked": ["spam-site.com", ...],
  "primary_info_domains": ["n8n.io", "community.n8n.io", ...]
}
```

### 業種マッピング追加

[config/industry-mappings.json](config/industry-mappings.json) を編集。

## ビルド・本番実行

```bash
# TypeScriptコンパイル
npm run build

# ビルド済みJSで実行
npm start -- --phase 1 --target-rows 120 --out-prefix n8n_phase1
```

## トラブルシューティング

### 検索結果が少ない

- `--per-query` を増やす（例: 30）
- `config/queries.json` にクエリを追加
- 並列数を増やす `--concurrency 10`

### LLM抽出エラー

- `.env` の `OPENAI_API_KEY` を確認
- APIレート制限に達している場合は並列数を減らす
- モデルを変更（`.env` の `LLM_MODEL=gpt-4o` 等）

### 目標件数に達しない

- 検索クエリを増やす
- より多くのドメインを優先リストに追加
- `--per-query` を増やす

## ライセンス

MIT

## 開発者向け

### モジュール構成

- `src/modules/search.ts` - Web検索（DuckDuckGo）
- `src/modules/fetch.ts` - HTML取得・本文抽出
- `src/modules/llm-extract.ts` - LLM抽出（OpenAI）
- `src/modules/normalize.ts` - 正規化・重複排除
- `src/modules/output.ts` - Markdown/CSV/ピボット/ROI出力
- `src/cli.ts` - CLIエントリーポイント
- `src/types/schema.ts` - 型定義
- `src/utils/` - ユーティリティ（config, retry）

### 拡張ポイント

- 検索プロバイダの差し替え（DuckDuckGo → SerpAPI/Google CSE）
- LLMプロバイダの差し替え（OpenAI → Anthropic Claude）
- 出力先の追加（Notion, Airtable, BigQuery等）
- n8nワークフロー版への移植

## サポート

issue報告・PR歓迎！
