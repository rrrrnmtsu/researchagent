import { CaseStudyRecord, IndustryType } from '../types/schema.js';
import { ConfigLoader } from '../utils/config.js';

/**
 * レコードの正規化
 */
export function normalizeRecord(record: CaseStudyRecord): CaseStudyRecord {
  return {
    ...record,
    業種: normalizeIndustry(record.業種),
    実装難易度: normalizeDifficulty(record.実装難易度),
    重複判定キー: generateDeduplicationKey(record),
  };
}

/**
 * 業種の正規化
 */
function normalizeIndustry(industry: string): IndustryType {
  const mappings = ConfigLoader.loadIndustryMappings();

  // そのまま業種リストに含まれている場合
  if (mappings.industries.includes(industry)) {
    return industry as IndustryType;
  }

  // 英語→日本語マッピング
  const normalized = industry.toLowerCase().trim();

  for (const [key, value] of Object.entries(mappings.mappings)) {
    if (normalized.includes(key.toLowerCase())) {
      return value as IndustryType;
    }
  }

  // マッチしない場合は「その他」
  return 'その他';
}

/**
 * 実装難易度の正規化（1-5の範囲）
 */
function normalizeDifficulty(difficulty: string): string {
  const num = parseInt(difficulty, 10);

  if (isNaN(num)) {
    // 数値でない場合は文字列から推定
    if (difficulty.includes('簡単') || difficulty.includes('単純')) return '1';
    if (difficulty.includes('中程度') || difficulty.includes('普通')) return '3';
    if (difficulty.includes('複雑') || difficulty.includes('高度')) return '5';
    return '3'; // デフォルト
  }

  // 範囲外の場合は丸める
  if (num < 1) return '1';
  if (num > 5) return '5';

  return String(num);
}

/**
 * 重複判定キーの生成
 */
function generateDeduplicationKey(record: CaseStudyRecord): string {
  // <組織/製品/ユースケース/出典ドメイン>
  const parts = [
    extractOrganization(record),
    extractProduct(record),
    extractUsecase(record),
    extractDomain(record.出典URL),
  ];

  const key = parts.join('_').toLowerCase();

  // 正規化: 英数字とアンダースコアのみ、最大200文字
  const normalized = key
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);

  return normalized;
}

/**
 * 組織名の抽出（タイトルから推定）
 */
function extractOrganization(record: CaseStudyRecord): string {
  // タイトルから組織名を抽出（簡易実装）
  const title = record.タイトル;

  // 「〇〇社」「〇〇株式会社」「〇〇Corp」などを抽出
  const orgMatch =
    title.match(/([A-Za-z0-9]+(?:社|株式会社|Corp|Inc|Ltd|Corporation))/i) ||
    title.match(/^([A-Za-z0-9]+)/);

  return orgMatch ? orgMatch[1] : 'unknown';
}

/**
 * 製品名の抽出
 */
function extractProduct(record: CaseStudyRecord): string {
  // 外部API/連携ツールから主要製品を抽出
  const tools = record['外部API/連携ツール'];
  const firstTool = tools.split(',')[0]?.trim();

  return firstTool || 'n8n';
}

/**
 * ユースケースの抽出
 */
function extractUsecase(record: CaseStudyRecord): string {
  // サブ領域をユースケースとして使用
  const usecase = record.サブ領域.replace(/[^a-z0-9]/gi, '_');

  return usecase || 'automation';
}

/**
 * ドメインの抽出
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/\./g, '_');
  } catch {
    return 'unknown_domain';
  }
}

/**
 * 重複レコードの排除（先勝ち方式）
 */
export function deduplicateRecords(records: CaseStudyRecord[]): CaseStudyRecord[] {
  const seen = new Set<string>();
  const unique: CaseStudyRecord[] = [];

  for (const record of records) {
    const key = record.重複判定キー;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    } else {
      console.log(`[Dedup] Skipping duplicate: ${record.タイトル} (key: ${key})`);
    }
  }

  console.log(`[Dedup] ${records.length} -> ${unique.length} (removed ${records.length - unique.length})`);

  return unique;
}

/**
 * ID採番（1始まり、3桁ゼロパディング）
 */
export function assignIds(records: CaseStudyRecord[]): CaseStudyRecord[] {
  return records.map((record, index) => ({
    ...record,
    ID: String(index + 1).padStart(3, '0'),
  }));
}
