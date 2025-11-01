import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { stringify } from 'csv-stringify/sync';
import { CaseStudyRecord, TopROIRecord } from '../types/schema.js';

/**
 * 出力ディレクトリ作成
 */
export function ensureOutputDir(): void {
  const outputDir = join(process.cwd(), 'output');
  mkdirSync(outputDir, { recursive: true });
}

/**
 * Markdown表＋直後CSV出力
 */
export function outputMarkdownWithCSV(
  records: CaseStudyRecord[],
  outputPath: string
): void {
  let markdown = '# n8n事例収集結果\n\n';

  const chunkSize = 50;
  const chunks = chunkArray(records, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    markdown += `## Part ${i + 1} (${chunk.length}件)\n\n`;

    // Markdown表
    markdown += generateMarkdownTable(chunk);
    markdown += '\n\n';

    // 直後にCSV
    markdown += '```csv\n';
    markdown += generateCSVString(chunk);
    markdown += '```\n\n';
  }

  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`[Output] Markdown saved: ${outputPath}`);
}

/**
 * CSVファイル出力
 */
export function outputCSV(records: CaseStudyRecord[], outputPath: string): void {
  const csv = generateCSVString(records);
  writeFileSync(outputPath, csv, 'utf-8');
  console.log(`[Output] CSV saved: ${outputPath}`);
}

/**
 * ピボット集計出力
 */
export function outputPivots(records: CaseStudyRecord[], outputPath: string): void {
  let markdown = '# ピボット集計\n\n';

  // 業種×ユースケース数
  markdown += '## 業種別件数\n\n';
  const industryCount = countByIndustry(records);
  for (const [industry, count] of Object.entries(industryCount)) {
    markdown += `- ${industry}: ${count}件\n`;
  }
  markdown += '\n';

  // トリガー種別構成
  markdown += '## トリガー種別構成\n\n';
  const triggerCount = countByTrigger(records);
  for (const [trigger, count] of Object.entries(triggerCount)) {
    markdown += `- ${trigger}: ${count}件\n`;
  }
  markdown += '\n';

  // 情報の種類比率
  markdown += '## 情報の種類比率\n\n';
  const infoTypeCount = countByInfoType(records);
  const total = records.length;
  for (const [type, count] of Object.entries(infoTypeCount)) {
    const percentage = ((count / total) * 100).toFixed(1);
    markdown += `- ${type}: ${count}件 (${percentage}%)\n`;
  }
  markdown += '\n';

  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`[Output] Pivots saved: ${outputPath}`);
}

/**
 * ROI上位20件出力
 */
export function outputTopROI(records: CaseStudyRecord[], outputPath: string): void {
  const scoredRecords = records.map((record) => ({
    ...record,
    score: calculateROIScore(record),
  }));

  // スコア降順でソート
  scoredRecords.sort((a, b) => b.score - a.score);

  const top20 = scoredRecords.slice(0, 20);

  let markdown = '# ROI上位20件\n\n';

  markdown += '| # | タイトル | 目的/KPI | 手順要点 | リスク/前提 | 出典URL |\n';
  markdown += '|---|---------|---------|---------|-----------|--------|\n';

  top20.forEach((record, index) => {
    const rank = index + 1;
    const title = escapeMd(record.タイトル);
    const kpi = escapeMd(record['目的/KPI']);
    const steps = escapeMd(record.主要n8nノード);
    const risks = escapeMd(record['運用上のリスク/前提']);
    const url = record.出典URL;

    markdown += `| ${rank} | ${title} | ${kpi} | ${steps} | ${risks} | ${url} |\n`;
  });

  markdown += '\n';

  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`[Output] Top ROI saved: ${outputPath}`);
}

/**
 * フェーズ2専用表出力（4業種のみ）
 */
export function outputFocusIndustries(
  records: CaseStudyRecord[],
  outputPath: string
): void {
  const focusIndustries = ['不動産', 'ホテル', '飲食', 'ナイト'];

  const filtered = records.filter((record) =>
    focusIndustries.includes(record.業種)
  );

  console.log(`[Output] Focus industries: ${filtered.length}件`);

  outputMarkdownWithCSV(filtered, outputPath);
}

/**
 * 監査ログ出力（JSONL）
 */
export function appendLog(
  log: any,
  outputPath: string
): void {
  const jsonLine = JSON.stringify(log) + '\n';
  const fs = require('fs');
  fs.appendFileSync(outputPath, jsonLine, 'utf-8');
}

// ========== ヘルパー関数 ==========

/**
 * Markdown表生成
 */
function generateMarkdownTable(records: CaseStudyRecord[]): string {
  const headers = [
    'ID',
    'タイトル',
    '業種',
    'サブ領域',
    '目的/KPI',
    'トリガー種別',
    '入力ソース',
    '出力先',
    '主要n8nノード',
    '外部API/連携ツール',
    'ワークフロー概要',
    '実装難易度',
    '規模目安',
    '成果/ROI',
    '運用上のリスク/前提',
    '地域/言語',
    '出典URL',
    '情報の種類',
    '公開日/更新日',
    '重複判定キー',
  ];

  let table = '| ' + headers.join(' | ') + ' |\n';
  table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  for (const record of records) {
    const row = [
      record.ID,
      escapeMd(record.タイトル),
      record.業種,
      escapeMd(record.サブ領域),
      escapeMd(record['目的/KPI']),
      escapeMd(record.トリガー種別),
      escapeMd(record.入力ソース),
      escapeMd(record.出力先),
      escapeMd(record.主要n8nノード),
      escapeMd(record['外部API/連携ツール']),
      escapeMd(record.ワークフロー概要),
      record.実装難易度,
      escapeMd(record.規模目安),
      escapeMd(record['成果/ROI']),
      escapeMd(record['運用上のリスク/前提']),
      escapeMd(record['地域/言語']),
      record.出典URL,
      record.情報の種類,
      record['公開日/更新日'],
      record.重複判定キー,
    ];

    table += '| ' + row.join(' | ') + ' |\n';
  }

  return table;
}

/**
 * CSV文字列生成
 */
function generateCSVString(records: CaseStudyRecord[]): string {
  const data = records.map((record) => [
    record.ID,
    record.タイトル,
    record.業種,
    record.サブ領域,
    record['目的/KPI'],
    record.トリガー種別,
    record.入力ソース,
    record.出力先,
    record.主要n8nノード,
    record['外部API/連携ツール'],
    record.ワークフロー概要,
    record.実装難易度,
    record.規模目安,
    record['成果/ROI'],
    record['運用上のリスク/前提'],
    record['地域/言語'],
    record.出典URL,
    record.情報の種類,
    record['公開日/更新日'],
    record.重複判定キー,
  ]);

  const headers = [
    'ID',
    'タイトル',
    '業種',
    'サブ領域',
    '目的/KPI',
    'トリガー種別',
    '入力ソース',
    '出力先',
    '主要n8nノード',
    '外部API/連携ツール',
    'ワークフロー概要',
    '実装難易度',
    '規模目安',
    '成果/ROI',
    '運用上のリスク/前提',
    '地域/言語',
    '出典URL',
    '情報の種類',
    '公開日/更新日',
    '重複判定キー',
  ];

  return stringify([headers, ...data], {
    quoted: true,
    quoted_empty: true,
    escape: '"',
  });
}

/**
 * 業種別集計
 */
function countByIndustry(records: CaseStudyRecord[]): Record<string, number> {
  const count: Record<string, number> = {};

  for (const record of records) {
    const industry = record.業種;
    count[industry] = (count[industry] || 0) + 1;
  }

  return count;
}

/**
 * トリガー種別集計（先頭のみ）
 */
function countByTrigger(records: CaseStudyRecord[]): Record<string, number> {
  const count: Record<string, number> = {};

  for (const record of records) {
    const trigger = record.トリガー種別.split('/')[0]?.trim();
    if (trigger) {
      count[trigger] = (count[trigger] || 0) + 1;
    }
  }

  return count;
}

/**
 * 情報の種類集計
 */
function countByInfoType(records: CaseStudyRecord[]): Record<string, number> {
  const count: Record<string, number> = {};

  for (const record of records) {
    const type = record.情報の種類;
    count[type] = (count[type] || 0) + 1;
  }

  return count;
}

/**
 * ROIスコア計算
 */
function calculateROIScore(record: CaseStudyRecord): number {
  let score = 0;

  const roi = record['成果/ROI'];

  // 数値出現個数 ×0.15（上限1.0）
  const numberMatches = roi.match(/\d+/g) || [];
  score += Math.min(numberMatches.length * 0.15, 1.0);

  // "ROI"出現 +0.3
  if (roi.includes('ROI')) {
    score += 0.3;
  }

  // "削減","短縮","%" いずれか +0.2
  if (roi.includes('削減') || roi.includes('短縮') || roi.includes('%')) {
    score += 0.2;
  }

  // 一次情報 +0.4
  if (record.情報の種類 === '一次情報') {
    score += 0.4;
  }

  return score;
}

/**
 * Markdownエスケープ
 */
function escapeMd(text: string): string {
  if (!text) return '';
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

/**
 * 配列を指定サイズで分割
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
