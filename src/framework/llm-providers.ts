/**
 * LLM Provider Adapters
 * 既存のLLMモジュールをフレームワークに適応
 */

import { GenericRecord } from './types.js';
import { LLMProvider } from './llm-extractor.js';

/**
 * OpenAI Provider
 */
export class OpenAIProvider implements LLMProvider {
  private extractFunc: any;

  constructor(extractFunc: any) {
    this.extractFunc = extractFunc;
  }

  async extract(
    systemPrompt: string,
    userPrompt: string,
    url: string
  ): Promise<GenericRecord | null> {
    try {
      // 既存の extractWithLLM を呼び出す
      // ただし、プロンプトをカスタマイズ
      const mockExtracted = {
        url,
        host: new URL(url).hostname,
        title: '',
        content: userPrompt, // ユーザープロンプトにコンテンツが含まれている
        publishedDate: '',
        updatedDate: '',
        detectedLang: '',
        detectedRegion: '',
      };

      // OpenAI APIを直接呼び出す
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });

      const model = process.env.LLM_MODEL || 'gpt-4o-mini';

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        return null;
      }

      const record = JSON.parse(content);
      return record;
    } catch (error: any) {
      console.error(`[OpenAI Error] ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * Anthropic Claude Provider
 */
export class AnthropicProvider implements LLMProvider {
  async extract(
    systemPrompt: string,
    userPrompt: string,
    url: string
  ): Promise<GenericRecord | null> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });

      const model = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';

      const message = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = message.content.find((block: any) => block.type === 'text');
      if (!textBlock || !('text' in textBlock)) {
        return null;
      }

      const text = (textBlock as any).text;

      // JSONを抽出（```json ... ``` の場合もある）
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const record = JSON.parse(jsonStr);
      return record;
    } catch (error: any) {
      console.error(`[Anthropic Error] ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * Ollama Provider
 */
export class OllamaProvider implements LLMProvider {
  async extract(
    systemPrompt: string,
    userPrompt: string,
    url: string
  ): Promise<GenericRecord | null> {
    try {
      const axios = (await import('axios')).default;
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      const model = process.env.LLM_MODEL || 'llama3.1';

      const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
          format: 'json',
        },
        { timeout: 60000 }
      );

      const content = response.data.message?.content;

      if (!content) {
        return null;
      }

      const record = JSON.parse(content);
      return record;
    } catch (error: any) {
      console.error(`[Ollama Error] ${url}: ${error.message}`);
      return null;
    }
  }
}

/**
 * LLM Provider Factory
 */
export class LLMProviderFactory {
  static create(provider?: string): LLMProvider {
    const providerName = provider || process.env.LLM_PROVIDER || 'openai';

    switch (providerName.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        return new AnthropicProvider();

      case 'ollama':
        return new OllamaProvider();

      case 'openai':
      default:
        return new OpenAIProvider(null);
    }
  }
}
