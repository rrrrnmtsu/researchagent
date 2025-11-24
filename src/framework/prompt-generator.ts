import { ExtractionConfig, ExtractedData } from './types.js';

/**
 * Prompt Generator
 * テンプレートから動的にLLMプロンプトを生成
 */
export class PromptGenerator {
  /**
   * システムプロンプトを取得
   */
  static getSystemPrompt(config: ExtractionConfig): string {
    return config.system_prompt.trim();
  }

  /**
   * ユーザープロンプトを生成（変数を置換）
   */
  static generateUserPrompt(
    config: ExtractionConfig,
    extracted: ExtractedData,
    initialInfoType: 'primary' | 'secondary'
  ): string {
    const infoTypeJp = initialInfoType === 'primary' ? '一次情報' : '二次情報';

    const variables: Record<string, string> = {
      url: extracted.url,
      info_type: infoTypeJp,
      published_date: extracted.publishedDate || '不明',
      updated_date: extracted.updatedDate || '不明',
      detected_lang: extracted.detectedLang || '不明',
      detected_region: extracted.detectedRegion || '不明',
      content: extracted.content,
    };

    let prompt = config.user_prompt_template;

    // 変数を置換（{{variable_name}} 形式）
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      prompt = prompt.replace(regex, value);
    }

    return prompt.trim();
  }

  /**
   * JSONスキーマ例を生成（LLMへの指示用）
   */
  static generateSchemaExample(fields: { name: string }[]): string {
    const example: Record<string, string> = {};

    for (const field of fields) {
      example[field.name] = '';
    }

    return JSON.stringify(example, null, 2);
  }
}
