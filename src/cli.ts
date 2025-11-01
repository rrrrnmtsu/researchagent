#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { join } from 'path';
import pLimit from 'p-limit';
import { searchWeb } from './modules/search.js';
import { fetchAndExtract } from './modules/fetch.js';
// LLMプロバイダ選択（.envのLLM_PROVIDERで切り替え）
// 'openai' → llm-extract.js
// 'anthropic' → llm-extract-claude.js
// 'ollama' → llm-extract-ollama.js
const llmProvider = process.env.LLM_PROVIDER || 'openai';
const llmModule =
  llmProvider === 'anthropic' ? './modules/llm-extract-claude.js' :
  llmProvider === 'ollama' ? './modules/llm-extract-ollama.js' :
  './modules/llm-extract.js';

const { extractWithLLM } = await import(llmModule);
import { normalizeRecord, deduplicateRecords, assignIds } from './modules/normalize.js';
import {
  ensureOutputDir,
  outputMarkdownWithCSV,
  outputCSV,
  outputPivots,
  outputTopROI,
  outputFocusIndustries,
  appendLog,
} from './modules/output.js';
import { ConfigLoader } from './utils/config.js';
import { CaseStudyRecord, ProcessLog } from './types/schema.js';

dotenv.config();

const program = new Command();

program
  .name('n8n-research-agent')
  .description('n8n事例収集・表出力自動化エージェント')
  .version('1.0.0')
  .option('--phase <number>', 'フェーズ (1 or 2)', '1')
  .option('--target-rows <number>', '目標件数', '120')
  .option(
    '--focus <industries>',
    'フェーズ2用業種 (例: realestate,hotel,restaurant,night)',
    ''
  )
  .option('--out-prefix <string>', '出力ファイル接頭辞', 'n8n_phase1')
  .option('--concurrency <number>', '並列数', '6')
  .option('--per-query <number>', '1クエリあたりの最大件数', '20')
  .parse(process.argv);

const options = program.opts();

const phase = parseInt(options.phase, 10);
const targetRows = parseInt(options.targetRows, 10);
const focusIndustries = options.focus ? options.focus.split(',') : [];
const outPrefix = options.outPrefix;
const concurrency = parseInt(options.concurrency, 10);
const perQuery = parseInt(options.perQuery, 10);

console.log(`
==============================================
n8n Research Agent
==============================================
Phase: ${phase}
Target Rows: ${targetRows}
Focus Industries: ${focusIndustries.length > 0 ? focusIndustries.join(', ') : 'なし'}
Output Prefix: ${outPrefix}
Concurrency: ${concurrency}
Per Query: ${perQuery}
==============================================
`);

async function main() {
  const startTime = Date.now();

  // 出力ディレクトリ準備
  ensureOutputDir();

  const logPath = join(process.cwd(), 'output', `${outPrefix}_log.jsonl`);

  // ========== 1. 検索 ==========
  console.log('\n[Step 1] 検索開始...');

  const queries = ConfigLoader.loadQueries();
  const allQueries = [...queries.jp, ...queries.en];

  const searchResults = await searchWeb(allQueries, {
    perQuery,
    concurrency,
  });

  console.log(`[Step 1] 検索完了: ${searchResults.length}件のURL`);

  // ========== 2. 取得・抽出・LLM処理 ==========
  console.log('\n[Step 2] 取得・LLM抽出開始...');

  const limit = pLimit(concurrency);
  const records: CaseStudyRecord[] = [];

  await Promise.all(
    searchResults.map((result) =>
      limit(async () => {
        const logEntry: ProcessLog = {
          url: result.url,
          host: new URL(result.url).hostname,
          time_sec: 0,
          status: 'failed',
        };

        const fetchStart = Date.now();

        try {
          // 取得・本文抽出
          const extracted = await fetchAndExtract(result.url);

          if (!extracted) {
            logEntry.status = 'skipped';
            logEntry.reason = 'Content too short or fetch failed';
            appendLog(logEntry, logPath);
            return;
          }

          // LLM抽出
          const record = await extractWithLLM(
            extracted,
            extracted.detectedLang === '日本語' ? '一次情報' : '二次情報'
          );

          if (!record) {
            logEntry.status = 'failed';
            logEntry.reason = 'LLM extraction failed';
            appendLog(logEntry, logPath);
            return;
          }

          // 正規化
          const normalized = normalizeRecord(record);

          records.push(normalized);

          logEntry.status = 'success';
          logEntry.info_type = normalized.情報の種類;
          logEntry.detected_date = normalized['公開日/更新日'];
          logEntry.time_sec = (Date.now() - fetchStart) / 1000;

          appendLog(logEntry, logPath);
        } catch (error: any) {
          logEntry.status = 'failed';
          logEntry.reason = error.message;
          logEntry.time_sec = (Date.now() - fetchStart) / 1000;
          appendLog(logEntry, logPath);
        }
      })
    )
  );

  console.log(`[Step 2] 抽出完了: ${records.length}件`);

  if (records.length === 0) {
    console.error('エラー: 抽出されたレコードがありません');
    process.exit(1);
  }

  // ========== 3. 重複排除・ID採番 ==========
  console.log('\n[Step 3] 重複排除・ID採番...');

  const uniqueRecords = deduplicateRecords(records);
  const finalRecords = assignIds(uniqueRecords);

  console.log(`[Step 3] 最終件数: ${finalRecords.length}件`);

  // 目標件数チェック（80%以上）
  const minRequired = Math.floor(targetRows * 0.8);
  if (finalRecords.length < minRequired) {
    console.warn(
      `警告: 目標件数の80%（${minRequired}件）に達していません（${finalRecords.length}件）`
    );
  }

  // ========== 4. 出力 ==========
  console.log('\n[Step 4] 出力開始...');

  const fullMdPath = join(process.cwd(), 'output', `${outPrefix}_full.md`);
  const fullCsvPath = join(process.cwd(), 'output', `${outPrefix}_full.csv`);
  const pivotsPath = join(process.cwd(), 'output', `${outPrefix}_pivots.md`);
  const topRoiPath = join(process.cwd(), 'output', `${outPrefix}_topROI.md`);

  outputMarkdownWithCSV(finalRecords, fullMdPath);
  outputCSV(finalRecords, fullCsvPath);
  outputPivots(finalRecords, pivotsPath);
  outputTopROI(finalRecords, topRoiPath);

  // フェーズ2専用出力
  if (phase === 2) {
    const focusPath = join(process.cwd(), 'output', `${outPrefix}_focus.md`);
    outputFocusIndustries(finalRecords, focusPath);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
==============================================
完了！
==============================================
最終件数: ${finalRecords.length}件
処理時間: ${elapsed}秒
出力ファイル:
  - ${fullMdPath}
  - ${fullCsvPath}
  - ${pivotsPath}
  - ${topRoiPath}
  ${phase === 2 ? `- ${join(process.cwd(), 'output', `${outPrefix}_focus.md`)}` : ''}
  - ${logPath}
==============================================
`);
}

main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
