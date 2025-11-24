import { ExtractionConfig, ExtractedData, GenericRecord } from './types.js';
import { PromptGenerator } from './prompt-generator.js';

/**
 * Generic LLM Extractor
 * テンプレートに基づいてLLM抽出を行う汎用クラス
 */
export class LLMExtractor {
  private config: ExtractionConfig;
  private llmProvider: any;

  constructor(config: ExtractionConfig, llmProvider: any) {
    this.config = config;
    this.llmProvider = llmProvider;
  }

  /**
   * LLMを使って情報を抽出
   */
  async extract(
    extracted: ExtractedData,
    initialInfoType: 'primary' | 'secondary'
  ): Promise<GenericRecord | null> {
    const systemPrompt = PromptGenerator.getSystemPrompt(this.config);
    const userPrompt = PromptGenerator.generateUserPrompt(
      this.config,
      extracted,
      initialInfoType
    );

    try {
      const record = await this.llmProvider.extract(systemPrompt, userPrompt, extracted.url);
      return record;
    } catch (error: any) {
      console.error(`[LLM Extraction Error] ${extracted.url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * LLM Provider Interface
 */
export interface LLMProvider {
  extract(systemPrompt: string, userPrompt: string, url: string): Promise<GenericRecord | null>;
}
