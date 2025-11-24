#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { ResearchEngine } from './framework/research-engine.js';
import { TemplateLoader } from './framework/template-loader.js';
import { LLMProviderFactory } from './framework/llm-providers.js';
import { ResearchExecutionOptions } from './framework/types.js';

dotenv.config();

const program = new Command();

program
  .name('research-agent')
  .description('汎用リサーチエージェント - テンプレートベースで様々なトピックをリサーチ')
  .version('2.0.0')
  .option('-t, --template <name>', 'テンプレート名（例: n8n）', 'n8n')
  .option('--list-templates', 'テンプレート一覧を表示')
  .option('--phase <number>', 'フェーズ（テンプレート固有）', '1')
  .option('--target-rows <number>', '目標件数', '120')
  .option('--focus <values>', 'フォーカス値（カンマ区切り）', '')
  .option('--out-prefix <string>', '出力ファイル接頭辞')
  .option('--concurrency <number>', '並列数')
  .option('--per-query <number>', '1クエリあたりの最大件数')
  .option('--llm-provider <provider>', 'LLMプロバイダー（openai/anthropic/ollama）')
  .parse(process.argv);

const options = program.opts();

async function main() {
  // テンプレート一覧表示
  if (options.listTemplates) {
    const templates = TemplateLoader.listTemplates();
    console.log('利用可能なテンプレート:');
    templates.forEach((t) => console.log(`  - ${t}`));
    return;
  }

  const templateName = options.template;

  // テンプレートが存在するか確認
  try {
    const templatePath = TemplateLoader.resolveTemplatePath(templateName);
    console.log(`✓ テンプレート見つかりました: ${templatePath}`);
  } catch (error: any) {
    console.error(`エラー: ${error.message}`);
    console.log('\n利用可能なテンプレート:');
    TemplateLoader.listTemplates().forEach((t) => console.log(`  - ${t}`));
    process.exit(1);
  }

  // LLMプロバイダーを初期化
  const llmProvider = LLMProviderFactory.create(options.llmProvider);

  // 実行オプションを構築
  const execOptions: ResearchExecutionOptions = {
    template: templateName,
    phase: parseInt(options.phase, 10),
    targetRows: parseInt(options.targetRows, 10),
    focusValues: options.focus ? options.focus.split(',') : [],
    outPrefix: options.outPrefix || `${templateName}_phase${options.phase}`,
    concurrency: options.concurrency ? parseInt(options.concurrency, 10) : undefined,
    perQuery: options.perQuery ? parseInt(options.perQuery, 10) : undefined,
  };

  // エンジンを作成して実行
  const engine = await ResearchEngine.createFromTemplate(
    templateName,
    execOptions,
    llmProvider
  );

  await engine.execute();
}

main().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
