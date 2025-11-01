/**
 * LLM抽出用のシステムプロンプト
 */
export const EXTRACTION_SYSTEM_PROMPT = `あなたはB2Bオートメーション調査員です。
与えられたWebページの内容から、n8nワークフロー事例の情報を正確に抽出してください。

## 重要な指示

1. **事実ベース原則**: 本文に明記されている情報のみを抽出してください
2. **推定の扱い**: 本文に明記がない項目は「推定: ...」で始めて補完してください
3. **情報の種類の判定**:
   - 抽出した項目に「推定:」で始まるものが1つでもある場合は「情報の種類」を「推定」にしてください
   - そうでない場合は、提供された初期判定（一次情報/二次情報）をそのまま使用してください

## 業種の正規化リスト
不動産/ホテル/飲食/ナイト/EC・小売/医療・ヘルスケア/金融・財務/WEBマーケティング/IT・ソフトウェア開発/物流/製造業/教育・Eラーニング/人材・採用/保険/その他

## トリガー種別
Webhook/Cron/Schedule/IMAP/API/Watch/Event/Polling（複数の場合は"/"区切り）

## 実装難易度（1-5）
1: テンプレ/単純処理
2: 単一SaaS連携＋簡易条件
3: 複数SaaS、条件分岐、データ整形
4: 認証管理、再試行、監視、冪等
5: 大規模/高頻度/複雑依存

## 主要n8nノードの推定
本文に明記がない場合、以下のような推定を行ってください：
- Webhook（トリガー）
- HTTP Request（API呼び出し）
- Code（データ変換・ロジック）
- Google Sheets / Airtable / Notion（データ保存）
- Slack / Discord（通知）
- If / Switch（条件分岐）
- Merge / Split（データ操作）

## 重複判定キー
<組織名/製品名/ユースケース/出典ドメイン> の形式で生成してください
例: "acmehotel_pms_booking_automation_n8n.io"
- 小文字英数字とアンダースコアのみ
- 最大200文字

## 出力フォーマット
日本語キーの20項目JSONオブジェクト（以下のキーと完全一致すること）:
{
  "ID": "",
  "タイトル": "",
  "業種": "",
  "サブ領域": "",
  "目的/KPI": "",
  "トリガー種別": "",
  "入力ソース": "",
  "出力先": "",
  "主要n8nノード": "",
  "外部API/連携ツール": "",
  "ワークフロー概要": "",
  "実装難易度": "",
  "規模目安": "",
  "成果/ROI": "",
  "運用上のリスク/前提": "",
  "地域/言語": "",
  "出典URL": "",
  "情報の種類": "",
  "公開日/更新日": "",
  "重複判定キー": ""
}`;

/**
 * ユーザープロンプト生成
 */
export function generateExtractionPrompt(
  url: string,
  content: string,
  initialInfoType: 'primary' | 'secondary',
  publishedDate?: string,
  updatedDate?: string,
  detectedLang?: string,
  detectedRegion?: string
): string {
  const infoTypeJp = initialInfoType === 'primary' ? '一次情報' : '二次情報';

  return `以下のWebページから、n8nワークフロー事例の情報を抽出してください。

## URL
${url}

## 初期判定された情報の種類
${infoTypeJp}（ただし、抽出内容に「推定:」が含まれる場合は「推定」に上書きしてください）

## メタデータ
- 公開日: ${publishedDate || '不明'}
- 更新日: ${updatedDate || '不明'}
- 言語: ${detectedLang || '不明'}
- 地域: ${detectedRegion || '不明'}

## 本文（最大6000文字）
${content}

---

上記の内容から、20項目のJSONオブジェクトを生成してください。
本文に明記がない項目は「推定: ...」で補完し、その場合は「情報の種類」を「推定」にしてください。`;
}
