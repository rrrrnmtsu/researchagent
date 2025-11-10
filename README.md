# Research Agent Framework

**汎用リサーチエージェントフレームワーク** - テンプレートベースで様々なトピックのWeb検索・情報抽出・構造化を自動化

## 特徴

- **テンプレート駆動**: YAML形式でリサーチ対象を定義し、簡単に横展開
- **完全自動化**: Web検索 → クロール → LLM抽出 → 正規化 → 出力まで自動
- **マルチLLM対応**: OpenAI/Anthropic Claude/Ollama
- **柔軟なスキーマ**: リサーチ対象に合わせて自由にカスタマイズ
- **多様な出力**: Markdown表/CSV/JSON/ピボット集計/ROI上位表
- **事実ベース原則**: 本文に明記された情報のみ抽出、推定は明示

## クイックスタート

### 1. インストール

```bash
# 依存関係インストール
npm install

# .envファイル作成
cp .env.example .env

# .envにAPIキーを設定
# OPENAI_API_KEY=your_api_key_here
# または
# ANTHROPIC_API_KEY=your_api_key_here
```

### 2. テンプレート一覧を確認

```bash
npm run research -- --list-templates
```

### 3. n8n事例のリサーチ（サンプル）

```bash
npm run research -- --template n8n --target-rows 100 --out-prefix n8n_research
```

## 使い方

### 基本コマンド

```bash
npm run research -- --template {テンプレート名} --target-rows {目標件数} --out-prefix {出力プレフィックス}
```

### オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-t, --template <name>` | テンプレート名 | n8n |
| `--list-templates` | テンプレート一覧表示 | - |
| `--target-rows <number>` | 目標件数 | 120 |
| `--out-prefix <string>` | 出力ファイル接頭辞 | {template}_phase{phase} |
| `--concurrency <number>` | 並列処理数 | 6 |
| `--per-query <number>` | 1クエリあたりの取得件数 | 20 |
| `--llm-provider <provider>` | LLMプロバイダー（openai/anthropic/ollama） | openai |

## 新しいリサーチテンプレートの作成

### ステップ1: テンプレートディレクトリを作成

```bash
mkdir -p templates/my_topic
```

### ステップ2: `template.yaml` を作成

```yaml
name: "My Topic Research"
version: "1.0.0"
description: "My topicの事例を収集"

search:
  queries:
    jp: ["トピック 事例", "トピック 導入"]
    en: ["topic case study", "topic implementation"]
  priority_domains: ["example.com"]
  primary_info_domains: ["example.com"]

schema:
  record_name: "MyTopicRecord"
  deduplication_key: "重複判定キー"
  fields:
    - name: "ID"
      type: "string"
      required: true
    - name: "タイトル"
      type: "string"
      required: true
    - name: "カテゴリ"
      type: "enum"
      required: true
      values: ["A", "B", "C"]
    - name: "概要"
      type: "string"
      required: true
    - name: "出典URL"
      type: "string"
      required: true
    - name: "情報の種類"
      type: "enum"
      required: true
      values: ["一次情報", "二次情報", "推定"]

extraction:
  system_prompt: |
    あなたはMy Topicの調査員です。
    与えられたWebページの内容から、My Topicに関する情報を正確に抽出してください。

    ## 重要な指示
    1. 事実ベース原則: 本文に明記されている情報のみを抽出
    2. 推定の扱い: 本文に明記がない項目は「推定: ...」で始める
    3. 情報の種類: 推定が含まれる場合は「情報の種類」を「推定」に

  user_prompt_template: |
    以下のWebページから、My Topicに関する情報を抽出してください。

    URL: {{url}}
    言語: {{detected_lang}}
    本文: {{content}}

normalization:
  deduplication_strategy: "key_based"

output:
  formats:
    - type: "markdown_table"
    - type: "csv"
    - type: "json"

execution:
  default_target_rows: 100
  default_concurrency: 6
  default_per_query: 20
  max_content_length: 6000
```

### ステップ3: 実行

```bash
npm run research -- --template my_topic --target-rows 100
```

詳細なテンプレート仕様は [docs/FRAMEWORK_GUIDE.md](docs/FRAMEWORK_GUIDE.md) を参照。

## 出力ファイル

実行後、`output/` ディレクトリに以下が生成されます：

- `{prefix}_full.md` - Markdown表（50行ごとに区切り、直後にCSV）
- `{prefix}_full.csv` - 全件CSV
- `{prefix}_full.json` - 全件JSON
- `{prefix}_log.jsonl` - 実行ログ（JSONL形式）

## サンプルテンプレート: n8n事例リサーチ

### 概要

n8nワークフロー自動化事例を収集し、20列の構造化データとして出力。

### 実行例

```bash
# フェーズ1（産業横断）
npm run research -- --template n8n --phase 1 --target-rows 120 --out-prefix n8n_phase1

# フェーズ2（業種特化: 不動産、ホテル、飲食、ナイト）
npm run research -- --template n8n --phase 2 --target-rows 100 --focus realestate,hotel,restaurant,night --out-prefix n8n_phase2
```

### 20列スキーマ

| 列名 | 説明 |
|-----|------|
| ID | 3桁ゼロパディング |
| タイトル | 事例名 |
| 業種 | 不動産/ホテル/飲食/ナイト/EC・小売等 |
| サブ領域 | 予約管理、在庫、PMS/OTA、POS、CRM等 |
| 目的/KPI | 数値があれば含む |
| トリガー種別 | Webhook/Cron/IMAP/API等 |
| 入力ソース | SaaS/DB/ファイル/フォーム名 |
| 出力先 | SaaS/DB/通知/シート/BI |
| 主要n8nノード | 3-10個 |
| 外部API/連携ツール | 固有名詞 |
| ワークフロー概要 | 150字程度 |
| 実装難易度 | 1-5 |
| 規模目安 | 頻度/件数/店舗等 |
| 成果/ROI | 定量優先、なければ定性 |
| 運用上のリスク/前提 | 認証、レート制限等 |
| 地域/言語 | JP/日本語、Global/英語等 |
| 出典URL | 事例のURL |
| 情報の種類 | 一次情報/二次情報/推定 |
| 公開日/更新日 | YYYY-MM-DD形式 |
| 重複判定キー | <組織/製品/ユースケース/出典ドメイン> |

## LLMプロバイダー

### OpenAI

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
LLM_MODEL=gpt-4o-mini
```

### Anthropic Claude

```bash
# .env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
LLM_MODEL=claude-3-5-sonnet-20241022
```

### Ollama（ローカルLLM）

```bash
# .env
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.1
```

## トラブルシューティング

### 検索結果が少ない

- `--per-query` を増やす（例: 30）
- テンプレートの `queries` を追加
- 並列数を増やす `--concurrency 10`

### LLM抽出エラー

- `.env` のAPIキーを確認
- APIレート制限に達している場合は並列数を減らす
- モデルを変更（例: `gpt-4o-mini` → `gpt-4o`）

### 目標件数に達しない

- 検索クエリを増やす
- より多くのドメインを優先リストに追加
- `--per-query` を増やす

## プロジェクト構造

```
researchagent/
├── templates/              # リサーチテンプレート
│   └── n8n/
│       └── template.yaml   # n8n事例テンプレート
├── src/
│   ├── framework/         # フレームワーク層
│   │   ├── types.ts
│   │   ├── template-loader.ts
│   │   ├── research-engine.ts
│   │   ├── llm-extractor.ts
│   │   ├── llm-providers.ts
│   │   └── prompt-generator.ts
│   ├── modules/           # コアモジュール
│   │   ├── search.ts      # Web検索（DuckDuckGo）
│   │   ├── fetch.ts       # HTML取得・本文抽出
│   │   ├── normalize.ts   # 正規化・重複排除
│   │   └── output.ts      # 出力（MD/CSV/JSON）
│   ├── cli.ts            # レガシーCLI（n8n専用、互換性維持）
│   └── research-cli.ts   # フレームワークCLI
├── output/                # 出力ディレクトリ
├── docs/                  # ドキュメント
│   └── FRAMEWORK_GUIDE.md # 完全ガイド
└── CLAUDE.md             # Claude用ガイド
```

## ドキュメント

- **完全ガイド**: [docs/FRAMEWORK_GUIDE.md](docs/FRAMEWORK_GUIDE.md)
- **Claude用ガイド**: [CLAUDE.md](CLAUDE.md)

## レガシーCLI（n8n専用）

互換性のため、既存のn8n専用CLIも残しています：

```bash
npm run dev -- --phase 1 --target-rows 120 --out-prefix n8n_phase1
```

新しいプロジェクトでは、フレームワークCLI（`npm run research`）の使用を推奨します。

## ライセンス

MIT

## 開発者向け

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

### リント

```bash
npm run lint
```

### 拡張ポイント

- **検索プロバイダ**: `src/modules/search.ts` を編集
- **LLMプロバイダ**: `src/framework/llm-providers.ts` に追加
- **出力フォーマット**: `src/modules/output.ts` に追加
- **カスタムフィルタ**: `src/framework/research-engine.ts` を拡張

## サポート

issue報告・PR歓迎！
