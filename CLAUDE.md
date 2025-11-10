# Claude AI - Research Agent Framework

このプロジェクトは**汎用リサーチエージェントフレームワーク**です。テンプレートベースで様々なトピックのリサーチを自動化できます。

## 重要: リサーチ依頼の自動実行

ユーザーから以下のようなリサーチ依頼があった場合、**自動的にこのワークフローを実行してください**：

- 「XXXについてリサーチして」
- 「YYYの事例を集めて」
- 「ZZZの導入事例を調査して」
- その他、Web検索とLLM抽出を使った情報収集が必要なリクエスト

## リサーチワークフローの実行手順

### 1. 既存テンプレートが使える場合

既存のテンプレートが使える場合は、すぐに実行：

```bash
npm run research -- --template n8n --target-rows 100 --out-prefix result
```

### 2. 新しいトピックの場合（テンプレート作成が必要）

新しいリサーチトピックの場合、以下の手順で進めてください：

#### ステップ1: テンプレートディレクトリを作成

```bash
mkdir -p templates/{トピック名}
```

#### ステップ2: テンプレート定義ファイルを作成

`templates/{トピック名}/template.yaml` を作成します。

**テンプレートの構造**:

```yaml
name: "{トピック名} Research"
version: "1.0.0"
description: "{トピックの説明}"

# 検索設定
search:
  queries:
    jp:
      - "{トピック} 事例"
      - "{トピック} 導入事例"
      # 追加の検索クエリ...
    en:
      - "{topic} case study"
      - "{topic} success stories"
      # 追加の検索クエリ...

  priority_domains:
    - "公式サイトドメイン"
    - "コミュニティサイト"
    # 優先ドメインのリスト...

  blocked_domains: []

  primary_info_domains:
    - "公式ドメイン"
    # 一次情報と見なすドメイン...

# データスキーマ定義
schema:
  record_name: "{Record型名}"
  deduplication_key: "重複判定キー"

  fields:
    - name: "ID"
      type: "string"
      required: true
      description: "一意のID"

    - name: "タイトル"
      type: "string"
      required: true
      description: "事例名・製品名など"

    # リサーチ対象に応じたフィールドを追加
    # 例: 業種、カテゴリ、目的、成果、URL、情報の種類など
    # 最低限：タイトル、カテゴリ、概要、出典URL、情報の種類は含める

    - name: "出典URL"
      type: "string"
      required: true
      description: "情報源のURL"

    - name: "情報の種類"
      type: "enum"
      required: true
      values: ["一次情報", "二次情報", "推定"]

# LLM抽出設定
extraction:
  system_prompt: |
    あなたは{トピック}の調査員です。
    与えられたWebページの内容から、{トピック}に関する情報を正確に抽出してください。

    ## 重要な指示
    1. **事実ベース原則**: 本文に明記されている情報のみを抽出してください
    2. **推定の扱い**: 本文に明記がない項目は「推定: ...」で始めて補完してください
    3. **情報の種類**: 推定が含まれる場合は「情報の種類」を「推定」にしてください

    ## 出力フォーマット
    定義したフィールドに対応するJSONオブジェクトを返してください。

  user_prompt_template: |
    以下のWebページから、{トピック}に関する情報を抽出してください。

    ## URL
    {{url}}

    ## 初期判定された情報の種類
    {{info_type}}

    ## メタデータ
    - 公開日: {{published_date}}
    - 更新日: {{updated_date}}
    - 言語: {{detected_lang}}

    ## 本文
    {{content}}

    ---
    上記の内容から、定義されたフィールドのJSONオブジェクトを生成してください。

# 正規化・重複排除設定
normalization:
  deduplication_strategy: "key_based"

# 出力設定
output:
  formats:
    - type: "markdown_table"
      rows_per_section: 50
      include_csv: true
    - type: "csv"
    - type: "json"

# 実行パラメータのデフォルト
execution:
  default_target_rows: 100
  default_concurrency: 6
  default_per_query: 20
  max_content_length: 6000
```

#### ステップ3: テンプレートをカスタマイズ

ユーザーの依頼内容に基づいて：

1. **検索クエリ**を適切に設定（日本語・英語）
2. **スキーマ（フィールド定義）**をリサーチ対象に合わせて設計
3. **LLMプロンプト**を調整（抽出したい情報の種類を明確に指示）

#### ステップ4: リサーチを実行

```bash
npm run research -- --template {トピック名} --target-rows {目標件数} --out-prefix {出力プレフィックス}
```

#### ステップ5: 結果を確認して報告

`output/` ディレクトリに生成されたファイルを確認し、ユーザーに報告：

- `{prefix}_full.md` - Markdown表
- `{prefix}_full.csv` - CSV
- `{prefix}_full.json` - JSON
- `{prefix}_log.jsonl` - 実行ログ

## テンプレート設計のガイドライン

### 検索クエリの設計

- 日本語と英語の両方を含める
- トピックの同義語・関連語を含める
- 具体的な業界や用途に特化したクエリも含める

### スキーマ設計

リサーチ対象に応じて以下のフィールドを検討：

- **基本**: ID, タイトル, 概要, 出典URL, 情報の種類, 公開日
- **分類**: 業種, カテゴリ, タグ
- **内容**: 目的, 課題, 解決策, 技術スタック, 機能
- **成果**: KPI, ROI, 成果指標
- **その他**: 規模, 地域, 言語, リスク/前提

### プロンプトの設計

- **システムプロンプト**: 調査員のロール、抽出ルール、出力形式を明確に
- **ユーザープロンプト**: URL、コンテンツ、メタデータを含める
- **事実ベース原則**: 推測と事実を区別するよう指示

## 利用可能なテンプレート

既存のテンプレート一覧を確認：

```bash
npm run research -- --list-templates
```

## 実行例

### n8nの事例リサーチ

```bash
npm run research -- --template n8n --target-rows 120 --out-prefix n8n_cases
```

### カスタムテンプレートの実行

```bash
npm run research -- --template {your_topic} --target-rows 100 --concurrency 10
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--template <name>` | テンプレート名 | n8n |
| `--list-templates` | テンプレート一覧表示 | - |
| `--target-rows <number>` | 目標件数 | 120 |
| `--out-prefix <string>` | 出力ファイル接頭辞 | {template}_phase{phase} |
| `--concurrency <number>` | 並列処理数 | 6 |
| `--per-query <number>` | 1クエリあたりの取得件数 | 20 |
| `--llm-provider <provider>` | LLMプロバイダー | openai |

## 環境変数

`.env` ファイルに以下を設定：

```bash
# LLMプロバイダー選択
LLM_PROVIDER=openai  # openai, anthropic, ollama

# OpenAI
OPENAI_API_KEY=your_key_here
LLM_MODEL=gpt-4o-mini

# Anthropic Claude
ANTHROPIC_API_KEY=your_key_here
LLM_MODEL=claude-3-5-sonnet-20241022

# Ollama
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.1
```

## トラブルシューティング

### テンプレートが見つからない

```bash
npm run research -- --list-templates
```

でテンプレート一覧を確認してください。

### 検索結果が少ない

- `--per-query` を増やす（例: 30）
- テンプレートの `queries` を追加
- `--concurrency` を増やす

### LLM抽出エラー

- `.env` のAPIキーを確認
- レート制限に達している場合は `--concurrency` を減らす

## プロジェクト構造

```
researchagent/
├── templates/              # リサーチテンプレート
│   └── n8n/               # n8n事例テンプレート
│       └── template.yaml
├── src/
│   ├── framework/         # フレームワーク層
│   │   ├── types.ts
│   │   ├── template-loader.ts
│   │   ├── research-engine.ts
│   │   ├── llm-extractor.ts
│   │   ├── llm-providers.ts
│   │   └── prompt-generator.ts
│   ├── modules/           # コアモジュール
│   │   ├── search.ts
│   │   ├── fetch.ts
│   │   ├── normalize.ts
│   │   └── output.ts
│   └── research-cli.ts    # フレームワークCLI
├── output/                # 出力ディレクトリ
└── CLAUDE.md             # このファイル
```

## まとめ

このフレームワークを使えば、様々なトピックのリサーチを簡単に自動化できます。

**Claudeとしての行動指針**:

1. ユーザーからリサーチ依頼があったら、まず既存テンプレートを確認
2. 既存テンプレートがなければ、新しいテンプレートを作成
3. テンプレートに基づいてリサーチを実行
4. 結果をユーザーに報告

これにより、一貫性のあるリサーチワークフローを提供できます。
