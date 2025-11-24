import { join } from 'path';
import pLimit from 'p-limit';
import {
  ResearchTemplate,
  ResearchExecutionOptions,
  GenericRecord,
  ProcessLog,
  ExtractedData,
} from './types.js';
import { TemplateLoader } from './template-loader.js';
import { LLMExtractor } from './llm-extractor.js';
import { searchWeb } from '../modules/search.js';
import { fetchAndExtract } from '../modules/fetch.js';
import {
  ensureOutputDir,
  outputMarkdownWithCSV,
  outputCSV,
  appendLog,
} from '../modules/output.js';

/**
 * Research Engine
 * テンプレートに基づいてリサーチを実行する汎用エンジン
 */
export class ResearchEngine {
  private template: ResearchTemplate;
  private options: ResearchExecutionOptions;
  private llmProvider: any;

  constructor(
    template: ResearchTemplate,
    options: ResearchExecutionOptions,
    llmProvider: any
  ) {
    this.template = template;
    this.options = options;
    this.llmProvider = llmProvider;
  }

  /**
   * メインの実行フロー
   */
  async execute(): Promise<void> {
    const startTime = Date.now();

    console.log(`
==============================================
Research Agent Framework
==============================================
Template: ${this.template.name} (v${this.template.version})
Description: ${this.template.description}
Target Rows: ${this.options.targetRows || this.template.execution.default_target_rows}
Output Prefix: ${this.options.outPrefix}
Concurrency: ${this.options.concurrency || this.template.execution.default_concurrency}
==============================================
`);

    // 出力ディレクトリ準備
    ensureOutputDir();

    const logPath = join(process.cwd(), 'output', `${this.options.outPrefix}_log.jsonl`);

    // ========== 1. 検索 ==========
    console.log('\n[Step 1] 検索開始...');
    const records = await this.searchAndExtract(logPath);

    if (records.length === 0) {
      console.error('エラー: 抽出されたレコードがありません');
      process.exit(1);
    }

    // ========== 2. 重複排除・ID採番 ==========
    console.log('\n[Step 2] 重複排除・ID採番...');
    const uniqueRecords = this.deduplicateRecords(records);
    const finalRecords = this.assignIds(uniqueRecords);

    console.log(`[Step 2] 最終件数: ${finalRecords.length}件`);

    // 目標件数チェック
    const targetRows = this.options.targetRows || this.template.execution.default_target_rows;
    const minRequired = Math.floor(targetRows * 0.8);
    if (finalRecords.length < minRequired) {
      console.warn(
        `警告: 目標件数の80%（${minRequired}件）に達していません（${finalRecords.length}件）`
      );
    }

    // ========== 3. 出力 ==========
    console.log('\n[Step 3] 出力開始...');
    await this.outputResults(finalRecords);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`
==============================================
完了！
==============================================
最終件数: ${finalRecords.length}件
処理時間: ${elapsed}秒
==============================================
`);
  }

  /**
   * 検索と抽出を実行
   */
  private async searchAndExtract(logPath: string): Promise<GenericRecord[]> {
    const concurrency = this.options.concurrency || this.template.execution.default_concurrency;
    const perQuery = this.options.perQuery || this.template.execution.default_per_query;

    // 検索クエリを取得
    const allQueries: string[] = [];
    for (const queries of Object.values(this.template.search.queries)) {
      allQueries.push(...queries);
    }

    const searchResults = await searchWeb(allQueries, { perQuery, concurrency });
    console.log(`[Step 1] 検索完了: ${searchResults.length}件のURL`);

    // 取得・抽出・LLM処理
    console.log('\n[Step 1.5] 取得・LLM抽出開始...');

    const limit = pLimit(concurrency);
    const records: GenericRecord[] = [];

    const extractor = new LLMExtractor(this.template.extraction, this.llmProvider);

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

            // 一次情報 vs 二次情報の判定
            const isPrimary = this.template.search.primary_info_domains.some((domain) =>
              extracted.host.includes(domain)
            );
            const initialInfoType = isPrimary ? 'primary' : 'secondary';

            // LLM抽出
            const record = await extractor.extract(extracted, initialInfoType);

            if (!record) {
              logEntry.status = 'failed';
              logEntry.reason = 'LLM extraction failed';
              appendLog(logEntry, logPath);
              return;
            }

            // 出典URLを追加
            record['出典URL'] = result.url;

            records.push(record);

            logEntry.status = 'success';
            logEntry.info_type = record['情報の種類'] || 'unknown';
            logEntry.detected_date = record['公開日/更新日'] || '';
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

    console.log(`[Step 1.5] 抽出完了: ${records.length}件`);

    return records;
  }

  /**
   * 重複排除
   */
  private deduplicateRecords(records: GenericRecord[]): GenericRecord[] {
    const dedupKey = this.template.schema.deduplication_key;

    if (!dedupKey) {
      return records;
    }

    const seen = new Set<string>();
    const unique: GenericRecord[] = [];

    for (const record of records) {
      const key = record[dedupKey];
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(record);
      }
    }

    return unique;
  }

  /**
   * ID採番
   */
  private assignIds(records: GenericRecord[]): GenericRecord[] {
    return records.map((record, index) => ({
      ...record,
      ID: String(index + 1).padStart(3, '0'),
    }));
  }

  /**
   * 結果を出力
   */
  private async outputResults(records: GenericRecord[]): Promise<void> {
    const outputDir = join(process.cwd(), 'output');

    for (const format of this.template.output.formats) {
      if (format.type === 'markdown_table') {
        const path = join(outputDir, `${this.options.outPrefix}_full.md`);
        outputMarkdownWithCSV(records, path);
        console.log(`✓ Markdown表を出力: ${path}`);
      } else if (format.type === 'csv') {
        const path = join(outputDir, `${this.options.outPrefix}_full.csv`);
        outputCSV(records, path);
        console.log(`✓ CSVを出力: ${path}`);
      } else if (format.type === 'json') {
        const path = join(outputDir, `${this.options.outPrefix}_full.json`);
        const { writeFileSync } = require('fs');
        writeFileSync(path, JSON.stringify(records, null, 2), 'utf-8');
        console.log(`✓ JSONを出力: ${path}`);
      }
    }
  }

  /**
   * ファクトリメソッド: テンプレート名から実行
   */
  static async createFromTemplate(
    templateName: string,
    options: ResearchExecutionOptions,
    llmProvider: any
  ): Promise<ResearchEngine> {
    const templatePath = TemplateLoader.resolveTemplatePath(templateName);
    const template = TemplateLoader.loadTemplate(templatePath);

    return new ResearchEngine(template, options, llmProvider);
  }
}
