# Research Agent Framework - 完全ガイド

## 概要

Research Agent Frameworkは、**テンプレートベースの汎用リサーチエージェント**です。
様々なトピックのWeb検索・情報抽出・構造化を自動化できます。

## 特徴

- **テンプレート駆動**: YAML形式でリサーチ対象を定義
- **完全自動化**: 検索 → 取得 → 抽出 → 正規化 → 出力まで自動
- **マルチLLM対応**: OpenAI/Claude/Ollama
- **柔軟なスキーマ**: リサーチ対象に合わせて自由にカスタマイズ
- **多様な出力**: Markdown表/CSV/JSON/ピボット集計

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│        Research Agent Framework         │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
   ┌────▼─────┐         ┌──────▼──────┐
   │ Template │         │    Engine   │
   │  Loader  │────────▶│ (Executor)  │
   └──────────┘         └──────┬──────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌─────▼──────┐      ┌───────▼────────┐
   │  Search  │────────▶│    Fetch   │─────▶│  LLM Extract   │
   │  Module  │         │   Module   │      │    (Multi)     │
   └──────────┘         └────────────┘      └───────┬────────┘
                                                     │
                                              ┌──────▼──────┐
                                              │ Normalize & │
                                              │   Output    │
                                              └─────────────┘
```

## クイックスタート

### 1. 既存テンプレートを使う

```bash
# n8n事例のリサーチ
npm run research -- --template n8n --target-rows 100 --out-prefix n8n_research

# テンプレート一覧を確認
npm run research -- --list-templates
```

### 2. 新しいテンプレートを作る

#### ステップ1: テンプレートディレクトリを作成

```bash
mkdir -p templates/my_topic
```

#### ステップ2: `template.yaml` を作成

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
    - name: "出典URL"
      type: "string"
      required: true
    - name: "情報の種類"
      type: "enum"
      required: true
      values: ["一次情報", "二次情報", "推定"]
    # 他のフィールドを追加...

extraction:
  system_prompt: |
    あなたはMy Topicの調査員です...
  user_prompt_template: |
    以下のWebページから情報を抽出してください。
    URL: {{url}}
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

#### ステップ3: 実行

```bash
npm run research -- --template my_topic --target-rows 100
```

## テンプレート仕様

### search

| フィールド | 説明 |
|-----------|------|
| `queries` | 検索クエリ（言語別） |
| `priority_domains` | 優先的に収集するドメイン |
| `blocked_domains` | 除外するドメイン |
| `primary_info_domains` | 一次情報と見なすドメイン |

### schema

| フィールド | 説明 |
|-----------|------|
| `record_name` | レコード型の名前 |
| `deduplication_key` | 重複排除に使うフィールド名 |
| `fields` | フィールド定義の配列 |

#### field定義

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `name` | フィールド名 | "タイトル" |
| `type` | データ型 | "string", "enum", "number" |
| `required` | 必須かどうか | true/false |
| `description` | 説明 | "事例のタイトル" |
| `values` | enumの場合の選択肢 | ["A", "B", "C"] |

### extraction

| フィールド | 説明 |
|-----------|------|
| `system_prompt` | LLMへのシステムプロンプト |
| `user_prompt_template` | ユーザープロンプトテンプレート（変数使用可） |

**利用可能な変数**:

- `{{url}}` - 記事のURL
- `{{content}}` - 本文
- `{{info_type}}` - 初期情報種別（一次情報/二次情報）
- `{{published_date}}` - 公開日
- `{{updated_date}}` - 更新日
- `{{detected_lang}}` - 検出言語
- `{{detected_region}}` - 検出地域

### normalization

| フィールド | 説明 |
|-----------|------|
| `deduplication_strategy` | 重複排除戦略（key_based/similarity/hybrid） |
| その他 | テンプレート固有の正規化設定 |

### output

| フィールド | 説明 |
|-----------|------|
| `formats` | 出力フォーマットの配列 |

**サポートされるフォーマット**:

- `markdown_table` - Markdown表
- `csv` - CSV
- `json` - JSON
- `pivot` - ピボット集計（dimensions指定）
- `top_records` - 上位レコード（sort_by, limit指定）

### execution

| フィールド | 説明 |
|-----------|------|
| `default_target_rows` | デフォルト目標件数 |
| `default_concurrency` | デフォルト並列数 |
| `default_per_query` | 1クエリあたりの取得件数 |
| `max_content_length` | 本文の最大文字数 |

## CLIオプション

```bash
npm run research -- [options]
```

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `-t, --template <name>` | テンプレート名 | n8n |
| `--list-templates` | テンプレート一覧表示 | - |
| `--phase <number>` | フェーズ | 1 |
| `--target-rows <number>` | 目標件数 | 120 |
| `--focus <values>` | フォーカス値（カンマ区切り） | - |
| `--out-prefix <string>` | 出力ファイル接頭辞 | {template}_phase{phase} |
| `--concurrency <number>` | 並列数 | 6 |
| `--per-query <number>` | 1クエリあたりの取得件数 | 20 |
| `--llm-provider <provider>` | LLMプロバイダー | openai |

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

### Ollama

```bash
# .env
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
LLM_MODEL=llama3.1
```

## 出力ファイル

実行後、`output/` ディレクトリに以下が生成されます：

- `{prefix}_full.md` - Markdown表（50行ごとに区切り、直後にCSV）
- `{prefix}_full.csv` - 全件CSV
- `{prefix}_full.json` - 全件JSON
- `{prefix}_log.jsonl` - 実行ログ（JSONL形式）

## ベストプラクティス

### 検索クエリの設計

- **多様性**: 同義語・関連語を含める
- **具体性**: 業界や用途に特化したクエリを追加
- **多言語**: 日本語と英語の両方を含める

例:
```yaml
queries:
  jp:
    - "製品名 事例"
    - "製品名 導入事例"
    - "製品名 成功事例"
    - "製品名 業界名"
  en:
    - "product case study"
    - "product success story"
    - "product industry"
```

### スキーマ設計

**推奨フィールド**:

- **必須**: ID, タイトル, 出典URL, 情報の種類
- **分類**: 業種/カテゴリ/タグ
- **内容**: 概要, 目的, 課題, 解決策
- **成果**: KPI, ROI, 成果指標
- **メタ**: 地域, 言語, 公開日

**命名規則**:

- 日本語キーを推奨（出力がわかりやすい）
- スラッシュ不要な場合は避ける（パース簡易化）

### プロンプト設計

**システムプロンプト**:

1. ロールを明確に（「あなたはXXXの調査員です」）
2. 抽出ルールを明示（事実ベース、推定の扱い）
3. 出力フォーマットを指定

**ユーザープロンプト**:

1. URL, コンテンツ, メタデータを含める
2. 変数（`{{xxx}}`）を活用
3. 具体的な指示を追加

## トラブルシューティング

### 検索結果が少ない

- `--per-query` を増やす（例: 30, 50）
- テンプレートの `queries` を追加
- `--concurrency` を増やす

### LLM抽出エラー

- APIキーを確認（`.env`）
- レート制限に達している場合は `--concurrency` を減らす
- モデルを変更（例: `gpt-4o` → `gpt-4o-mini`）

### 目標件数に達しない

- 検索クエリを増やす
- より多くのドメインを `priority_domains` に追加
- `--per-query` を増やす

### 重複が多い

- `deduplication_key` の生成ロジックを見直す
- システムプロンプトで重複判定キーの生成方法を明確化

## プロジェクト構造

```
researchagent/
├── templates/              # リサーチテンプレート
│   └── n8n/
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
│   │   ├── search.ts      # Web検索
│   │   ├── fetch.ts       # コンテンツ取得
│   │   ├── normalize.ts   # 正規化
│   │   └── output.ts      # 出力
│   └── research-cli.ts    # フレームワークCLI
├── output/                # 出力ディレクトリ
├── docs/                  # ドキュメント
└── CLAUDE.md             # Claude用ガイド
```

## API（プログラマティック使用）

```typescript
import { ResearchEngine } from './framework/research-engine.js';
import { LLMProviderFactory } from './framework/llm-providers.js';

const llmProvider = LLMProviderFactory.create('openai');

const engine = await ResearchEngine.createFromTemplate(
  'n8n',
  {
    template: 'n8n',
    targetRows: 100,
    outPrefix: 'my_research',
    concurrency: 6,
  },
  llmProvider
);

await engine.execute();
```

## 拡張ポイント

### 検索プロバイダの追加

`src/modules/search.ts` を編集して、SerpAPI/Google CSE等を追加可能。

### LLMプロバイダの追加

`src/framework/llm-providers.ts` に新しいプロバイダークラスを実装。

### 出力フォーマットの追加

`src/modules/output.ts` に新しい出力関数を実装。

### カスタムフィルタリング

`src/framework/research-engine.ts` の `outputResults` メソッドを拡張。

## まとめ

Research Agent Frameworkを使えば、様々なリサーチを簡単に自動化できます。

**ワークフロー**:

1. テンプレートを作成（またはn8nテンプレートを参考に）
2. 検索クエリとスキーマを定義
3. プロンプトをカスタマイズ
4. 実行して結果を確認
5. 必要に応じてクエリやプロンプトを調整

質問や提案があれば、issueを作成してください！
