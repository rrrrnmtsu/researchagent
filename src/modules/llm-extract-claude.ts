import Anthropic from '@anthropic-ai/sdk';
import { CaseStudyRecord, ExtractedData, InfoType } from '../types/schema.js';
import { ConfigLoader } from '../utils/config.js';
import {
  EXTRACTION_SYSTEM_PROMPT,
  generateExtractionPrompt,
} from '../prompts/extraction-prompt.js';

/**
 * LLM抽出（Anthropic Claude）
 */
export async function extractWithLLM(
  data: ExtractedData,
  initialInfoType: InfoType
): Promise<CaseStudyRecord | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';

  try {
    console.log(`[LLM] Extracting from: ${data.url}`);

    // 初期情報種別の判定
    const primaryDomains = ConfigLoader.loadDomains().primary_info_domains;
    const isPrimary = primaryDomains.some((domain) => data.host.includes(domain));
    const infoTypeForPrompt = isPrimary ? 'primary' : 'secondary';

    const userPrompt = generateExtractionPrompt(
      data.url,
      data.content,
      infoTypeForPrompt,
      data.publishedDate,
      data.updatedDate,
      data.detectedLang,
      data.detectedRegion
    );

    // LLM呼び出し（最大2回リトライ）
    let lastError: any;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: EXTRACTION_SYSTEM_PROMPT + '\n\n' + userPrompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type');
        }

        const textContent = content.text;

        // JSON抽出（```json...```ブロックがある場合に対応）
        const jsonMatch = textContent.match(/```json\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[1] : textContent;

        // JSONパース
        const parsed = JSON.parse(jsonString) as CaseStudyRecord;

        // バリデーション: 必須フィールドチェック
        validateRecord(parsed);

        // 「推定」の上書き判定
        const hasEstimation = checkForEstimation(parsed);
        if (hasEstimation) {
          parsed.情報の種類 = '推定';
        }

        console.log(`[LLM] Successfully extracted: ${parsed.タイトル}`);

        return parsed;
      } catch (error: any) {
        lastError = error;
        console.warn(`[LLM] Attempt ${attempt + 1}/2 failed:`, error.message);

        if (attempt < 1) {
          // リトライ前に少し待機
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    console.error(`[LLM] Failed to extract after 2 attempts:`, lastError.message);
    return null;
  } catch (error: any) {
    console.error(`[LLM] Extraction failed for ${data.url}:`, error.message);
    return null;
  }
}

/**
 * レコードバリデーション
 */
function validateRecord(record: CaseStudyRecord): void {
  const requiredFields: (keyof CaseStudyRecord)[] = [
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

  for (const field of requiredFields) {
    if (!(field in record)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * 「推定:」が含まれているかチェック
 */
function checkForEstimation(record: CaseStudyRecord): boolean {
  const fieldsToCheck = [
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
  ];

  return fieldsToCheck.some((field) =>
    field && typeof field === 'string' && field.startsWith('推定:')
  );
}
