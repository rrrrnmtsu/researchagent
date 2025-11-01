/**
 * 20列スキーマ定義
 */
export interface CaseStudyRecord {
  ID: string; // 3桁ゼロパディング ("001", "002", ...)
  タイトル: string;
  業種: IndustryType;
  サブ領域: string;
  "目的/KPI": string;
  トリガー種別: string; // 複数可 "/" 区切り
  入力ソース: string;
  出力先: string;
  主要n8nノード: string; // 3-10個
  "外部API/連携ツール": string;
  ワークフロー概要: string; // 150字程度
  実装難易度: string; // "1"-"5"
  規模目安: string;
  "成果/ROI": string;
  "運用上のリスク/前提": string;
  "地域/言語": string;
  出典URL: string;
  情報の種類: InfoType;
  "公開日/更新日": string; // ISO8601 (YYYY-MM-DD) or empty
  重複判定キー: string; // <組織/製品/ユースケース/出典ドメイン>
}

/**
 * 業種の正規化リスト
 */
export type IndustryType =
  | "不動産"
  | "ホテル"
  | "飲食"
  | "ナイト"
  | "EC・小売"
  | "医療・ヘルスケア"
  | "金融・財務"
  | "WEBマーケティング"
  | "IT・ソフトウェア開発"
  | "物流"
  | "製造業"
  | "教育・Eラーニング"
  | "人材・採用"
  | "保険"
  | "その他";

/**
 * 情報の種類
 */
export type InfoType = "一次情報" | "二次情報" | "推定";

/**
 * トリガー種別の定義
 */
export const TriggerTypes = [
  "Webhook",
  "Cron",
  "Schedule",
  "IMAP",
  "API",
  "Watch",
  "Event",
  "Polling"
] as const;

/**
 * LLM抽出用の生データ
 */
export interface ExtractedData {
  url: string;
  host: string;
  title: string;
  content: string; // 本文（最大6000文字）
  publishedDate?: string;
  updatedDate?: string;
  detectedLang?: string;
  detectedRegion?: string;
}

/**
 * 処理ログ（監査用）
 */
export interface ProcessLog {
  url: string;
  host: string;
  time_sec: number;
  info_type?: InfoType;
  detected_date?: string;
  prefer_score?: number; // 0-1
  status: "success" | "failed" | "skipped" | "duplicate";
  reason?: string; // 失敗理由
}

/**
 * CLIパラメータ
 */
export interface CliOptions {
  phase: 1 | 2;
  targetRows: number;
  focus?: string[]; // フェーズ2用: ["realestate", "hotel", "restaurant", "night"]
  outPrefix: string;
  concurrency: number;
  perQuery: number;
}

/**
 * 検索結果
 */
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * ROI上位表示用の簡易レコード
 */
export interface TopROIRecord {
  タイトル: string;
  "目的/KPI": string;
  手順要点: string; // 主要n8nノード
  "リスク/前提": string;
  出典URL: string;
  score: number;
}
