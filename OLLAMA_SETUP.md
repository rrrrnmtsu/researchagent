# Ollama ローカルLLM セットアップガイド

## 完全無料でn8n事例を収集！

このガイドでは、**API コストゼロ**でローカルLLMを使用する方法を説明します。

---

## 📋 前提条件

### ハードウェア要件

| モデル | 最小RAM | 推奨RAM | VRAM（GPU） | 処理速度 |
|--------|---------|---------|-----------|---------|
| **Qwen2.5 72B** | 48GB | 64GB | 24GB以上 | 遅め（1件/30-60秒） |
| Qwen2.5 32B | 24GB | 32GB | 16GB以上 | 中速（1件/15-30秒） |
| Llama 3.1 8B | 12GB | 16GB | 8GB以上 | 高速（1件/5-10秒） |
| Gemma 2 27B | 20GB | 32GB | 16GB以上 | 中速（1件/20-40秒） |

**M1/M2/M3 Mac の場合**: Unified Memoryなので、システムメモリ=VRAMとして使用可能

**あなたのMac確認方法**:
```bash
# メモリ確認
sysctl hw.memsize | awk '{print $2/1024/1024/1024 "GB"}'

# チップ確認
sysctl machdep.cpu.brand_string
```

---

## 🚀 セットアップ（10分）

### 1. Ollama インストール

```bash
# Homebrew経由でインストール
brew install ollama

# 確認
ollama --version
```

### 2. モデルダウンロード

#### 推奨1: Qwen2.5 72B（最高精度、64GB RAM推奨）

```bash
ollama pull qwen2.5:72b-instruct
```

**ダウンロード時間**: 約10-20分（40GB）

#### 推奨2: Qwen2.5 32B（バランス型、32GB RAM推奨）

```bash
ollama pull qwen2.5:32b-instruct
```

**ダウンロード時間**: 約5-10分（18GB）

#### 軽量版: Llama 3.1 8B（高速、16GB RAMでOK）

```bash
ollama pull llama3.1:8b-instruct
```

**ダウンロード時間**: 約2-5分（5GB）

### 3. Ollama サーバー起動

```bash
# バックグラウンドで起動
ollama serve &

# 確認（別ターミナルで）
curl http://localhost:11434/api/tags
```

### 4. .env 設定

```bash
cd /Users/remma/project/researchagent
cp .env.ollama.example .env
```

`.env` を編集：

```env
OLLAMA_URL=http://localhost:11434
LLM_MODEL=qwen2.5:72b-instruct
LLM_PROVIDER=ollama
CONCURRENCY=2
PER_QUERY_LIMIT=20
```

**重要**: `CONCURRENCY=2` に設定（ローカルLLMは遅いため）

### 5. ビルド

```bash
npm run build
```

---

## 🧪 テスト実行

### 小規模テスト（5件、約5-10分）

```bash
npm run dev -- --phase 1 --target-rows 5 --per-query 5 --concurrency 1 --out-prefix test_ollama
```

**期待結果**:
- `output/test_ollama_full.md` 生成
- コンソールに抽出進捗表示

### 中規模テスト（20件、約20-40分）

```bash
npm run dev -- --phase 1 --target-rows 20 --concurrency 2 --out-prefix medium_ollama
```

### フル実行（100件、約2-4時間）

```bash
npm run dev -- --phase 1 --target-rows 100 --concurrency 2 --out-prefix full_ollama
```

---

## ⚡ パフォーマンス最適化

### 1. モデル選択

| 用途 | 推奨モデル | 理由 |
|------|-----------|------|
| **最高精度** | Qwen2.5 72B | 日本語理解・JSON出力が最高 |
| **バランス** | Qwen2.5 32B | 精度と速度のバランス |
| **高速処理** | Llama 3.1 8B | 軽量・高速 |

### 2. 並列数調整

```bash
# 高速マシン（64GB RAM以上）
--concurrency 4

# 標準マシン（32GB RAM）
--concurrency 2

# 軽量マシン（16GB RAM）
--concurrency 1
```

### 3. 量子化モデル使用

メモリ不足の場合、量子化版を使用：

```bash
# Q4量子化（メモリ約半分、精度やや低下）
ollama pull qwen2.5:72b-instruct-q4_0

# Q5量子化（メモリ削減、精度ほぼ維持）
ollama pull qwen2.5:72b-instruct-q5_K_M
```

---

## 🔍 トラブルシューティング

### 問題1: メモリ不足エラー

**症状**: `Error: Not enough memory`

**対策**:
```bash
# 軽量モデルに変更
ollama pull qwen2.5:32b-instruct

# .env 修正
LLM_MODEL=qwen2.5:32b-instruct
CONCURRENCY=1
```

### 問題2: 処理が遅すぎる

**症状**: 1件抽出に5分以上かかる

**対策**:
```bash
# 軽量モデルに変更
ollama pull llama3.1:8b-instruct

# .env 修正
LLM_MODEL=llama3.1:8b-instruct
```

### 問題3: JSON パースエラー

**症状**: `JSON.parse error`

**原因**: モデルがJSON出力に失敗

**対策**:
1. Qwen2.5に変更（JSON出力が最も安定）
2. プロンプト調整（`src/prompts/extraction-prompt.ts`）
3. リトライが自動で働くため、通常は問題なし

### 問題4: Ollama サーバー接続エラー

**症状**: `ECONNREFUSED localhost:11434`

**対策**:
```bash
# サーバー起動確認
ps aux | grep ollama

# 再起動
pkill ollama
ollama serve &

# 確認
curl http://localhost:11434/api/tags
```

---

## 📊 コスト・速度比較

### 100件収集時の比較

| LLM | コスト | 処理時間 | 精度 | RAM要件 |
|-----|--------|---------|------|---------|
| **Qwen2.5 72B（Ollama）** | **無料** | 2-4時間 | ★★★★★ | 64GB |
| Qwen2.5 32B（Ollama） | **無料** | 1-2時間 | ★★★★☆ | 32GB |
| Llama 3.1 8B（Ollama） | **無料** | 30-60分 | ★★★☆☆ | 16GB |
| Claude 3.5 Sonnet（API） | $5-8 | 15-25分 | ★★★★★ | なし |
| OpenAI gpt-4o-mini（API） | $2-3 | 15-25分 | ★★★★☆ | なし |

**結論**:
- **時間に余裕あり＋高精度**: Qwen2.5 72B（Ollama）
- **バランス重視**: Qwen2.5 32B（Ollama）
- **高速＋低精度OK**: Llama 3.1 8B（Ollama）
- **時間優先＋予算あり**: Claude/OpenAI（API）

---

## 🎯 推奨ワークフロー

### フェーズ1: テスト（5件、10分）

```bash
npm run dev -- \
  --phase 1 \
  --target-rows 5 \
  --concurrency 1 \
  --out-prefix test_ollama
```

### フェーズ2: 中規模（20件、40分）

```bash
npm run dev -- \
  --phase 1 \
  --target-rows 20 \
  --concurrency 2 \
  --out-prefix medium_ollama
```

### フェーズ3: 本番（100件、2-4時間）

```bash
# 夜間実行推奨（長時間かかるため）
nohup npm run dev -- \
  --phase 1 \
  --target-rows 100 \
  --concurrency 2 \
  --out-prefix production_ollama \
  > ollama_run.log 2>&1 &

# 進捗確認
tail -f ollama_run.log
```

---

## 🔄 API版との切り替え

### Ollama → Claude API

```env
# .env 修正
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
CONCURRENCY=6
```

### Ollama → OpenAI API

```env
# .env 修正
OPENAI_API_KEY=sk-proj-xxxxx
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
CONCURRENCY=6
```

**動的切り替え**: `.env` の `LLM_PROVIDER` を変更するだけでOK

---

## 📝 まとめ

### メリット
- ✅ **完全無料**（APIコストゼロ）
- ✅ プライバシー保護（データ外部送信なし）
- ✅ レート制限なし
- ✅ 長期運用でもコスト増加なし

### デメリット
- ⚠️ 処理時間が長い（API版の10-20倍）
- ⚠️ 高性能マシン必要（64GB RAM推奨）
- ⚠️ 抽出精度がやや低い可能性

### 推奨シナリオ
- 定期実行（週次・月次）
- 大量収集（500件以上）
- 予算制約あり
- プライバシー重視

---

**次のアクション**:
1. `brew install ollama`
2. `ollama pull qwen2.5:72b-instruct`
3. `.env` 設定
4. テスト実行（5件）

質問があればお知らせください！
