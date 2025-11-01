# LLM プロバイダー完全比較ガイド

本プロジェクトは**3つのLLMプロバイダー**に対応しています。

---

## 📊 総合比較表

| プロバイダー | コスト（100件） | 処理時間 | 精度 | セットアップ | RAM要件 | 推奨度 |
|------------|---------------|---------|------|-----------|---------|-------|
| **Qwen2.5 72B（Ollama）** | **無料** | 2-4時間 | ★★★★★ | 中級 | 64GB | 🥇 長期運用 |
| Qwen2.5 32B（Ollama） | **無料** | 1-2時間 | ★★★★☆ | 中級 | 32GB | 🥈 バランス |
| Llama 3.1 8B（Ollama） | **無料** | 30-60分 | ★★★☆☆ | 中級 | 16GB | 🥉 軽量 |
| **Claude 3.5 Sonnet** | $5-8 | 15-25分 | ★★★★★ | 簡単 | なし | 🥇 即座実行 |
| Claude 3 Haiku | $1-2 | 15-25分 | ★★★★☆ | 簡単 | なし | 🥈 低コスト |
| OpenAI gpt-4o-mini | $2-3 | 15-25分 | ★★★★☆ | 簡単 | なし | 🥉 標準 |

---

## 🎯 シナリオ別推奨

### シナリオ1: 今すぐ結果が欲しい

**推奨**: Claude 3.5 Sonnet（API）

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
CONCURRENCY=6
```

**理由**:
- 15-25分で100件収集完了
- 最高精度の抽出
- セットアップ5分

---

### シナリオ2: 予算制約あり、時間に余裕あり

**推奨**: Qwen2.5 72B（Ollama）

```env
OLLAMA_URL=http://localhost:11434
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:72b-instruct
CONCURRENCY=2
```

**理由**:
- **完全無料**（APIコストゼロ）
- Claude並みの精度
- 2-4時間で完了（夜間実行可）

---

### シナリオ3: 定期実行（週次・月次）

**推奨**: Qwen2.5 32B（Ollama）

```env
OLLAMA_URL=http://localhost:11434
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:32b-instruct
CONCURRENCY=2
```

**理由**:
- 無料で定期実行可能
- 1-2時間で完了
- 32GB RAMでOK

---

### シナリオ4: 大量収集（500件以上）

**推奨**: Ollama（Qwen2.5 32B or Llama 3.1 8B）

**理由**:
- 500件×$5=$25 vs 無料
- レート制限なし
- 長時間実行でも安定

---

### シナリオ5: 軽量マシン（16GB RAM）

**推奨**: Claude 3 Haiku（API）または Llama 3.1 8B（Ollama）

```env
# API版（簡単）
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku-20240307
CONCURRENCY=6

# またはOllama軽量版（無料）
OLLAMA_URL=http://localhost:11434
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b-instruct
CONCURRENCY=1
```

---

## 🔄 切り替え手順

### 1. Ollama セットアップ（初回のみ、10分）

```bash
# インストール
brew install ollama

# モデルダウンロード
ollama pull qwen2.5:72b-instruct

# サーバー起動
ollama serve &
```

### 2. .env 設定

**Ollama（無料）**:
```env
OLLAMA_URL=http://localhost:11434
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:72b-instruct
CONCURRENCY=2
```

**Claude（API）**:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
CONCURRENCY=6
```

**OpenAI（API）**:
```env
OPENAI_API_KEY=sk-proj-xxxxx
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
CONCURRENCY=6
```

### 3. 実行

```bash
npm run dev -- --phase 1 --target-rows 100 --out-prefix test
```

**自動切り替え**: `.env` の `LLM_PROVIDER` を変更するだけでOK

---

## 💡 ハイブリッド戦略

### 戦略A: テスト→本番で切り替え

```bash
# 1. テスト実行（5件、Ollama無料）
LLM_PROVIDER=ollama npm run dev -- --target-rows 5 --out-prefix test

# 2. 結果確認後、本番実行（100件、Claude高速）
LLM_PROVIDER=anthropic npm run dev -- --target-rows 100 --out-prefix prod
```

### 戦略B: 定期実行は無料、緊急時は有料

```bash
# 週次定期実行（夜間、Ollama無料）
crontab -e
0 2 * * 1 cd /path/to/project && LLM_PROVIDER=ollama npm start -- --target-rows 100

# 緊急時（即座、Claude有料）
LLM_PROVIDER=anthropic npm run dev -- --target-rows 50 --out-prefix urgent
```

---

## 📈 コスト試算

### 月次運用（毎週100件収集）

| プロバイダー | 週次コスト | 月次コスト | 年間コスト |
|------------|-----------|-----------|-----------|
| **Ollama** | **無料** | **無料** | **無料** |
| Claude 3.5 Sonnet | $5-8 | $20-32 | $240-384 |
| Claude 3 Haiku | $1-2 | $4-8 | $48-96 |
| OpenAI gpt-4o-mini | $2-3 | $8-12 | $96-144 |

**ROI計算**:
- 年間 $240-384 vs **無料**（Ollama）
- 人件費換算: 手動調査なら 100件×30分=50時間/週 → **年間2,600時間削減**

---

## 🔍 詳細ドキュメント

- [OLLAMA_SETUP.md](OLLAMA_SETUP.md) - Ollamaセットアップ詳細
- [SWITCHING_TO_CLAUDE.md](SWITCHING_TO_CLAUDE.md) - Claude API切り替え
- [README.md](README.md) - 全体ドキュメント

---

## ❓ FAQ

### Q1. どのLLMが一番精度高い？

**A**: Claude 3.5 Sonnet = Qwen2.5 72B > Claude 3 Haiku = Qwen2.5 32B > OpenAI gpt-4o-mini > Llama 3.1 8B

日本語理解・JSON出力の安定性では **Qwen2.5 72B** と **Claude 3.5 Sonnet** が同等。

### Q2. OllamaとAPIを併用できる？

**A**: はい。`.env` の `LLM_PROVIDER` を変更するだけで動的切り替え可能。

### Q3. Ollamaの処理時間を短縮できる？

**A**: 以下の方法で高速化可能：
- 軽量モデル使用（Llama 3.1 8B）
- 並列数を増やす（`CONCURRENCY=4`）
- GPU使用（M1/M2 Mac推奨）
- 量子化モデル使用（Q4/Q5）

### Q4. どのマシンでOllamaが動く？

**A**:
- **M1/M2/M3 Mac**: 推奨（Unified Memory活用）
- Intel Mac: 64GB RAM以上推奨
- Linux（GPU搭載）: 最適
- Windows（WSL2）: 可能

### Q5. Claude APIキーの取得方法は？

**A**: [Anthropic Console](https://console.anthropic.com/)でアカウント作成→API Key発行

---

## 🎯 まとめ

### 今すぐ試したい → Claude 3.5 Sonnet

```bash
# .env設定
ANTHROPIC_API_KEY=sk-ant-xxxxx
LLM_PROVIDER=anthropic

# 実行
npm run dev -- --target-rows 10 --out-prefix quick_test
```

### 無料で本格運用 → Qwen2.5 72B（Ollama）

```bash
# セットアップ
brew install ollama
ollama pull qwen2.5:72b-instruct
ollama serve &

# .env設定
LLM_PROVIDER=ollama

# 実行
npm run dev -- --target-rows 100 --out-prefix free_production
```

---

**次のアクション**:
1. シナリオを選択
2. セットアップ（5-10分）
3. テスト実行（5-10件）
4. 本番実行（100件）

質問があればお知らせください！
