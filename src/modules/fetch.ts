import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { ExtractedData } from '../types/schema.js';
import { retry, withTimeout } from '../utils/retry.js';

/**
 * HTML取得とメタデータ抽出
 */
export async function fetchAndExtract(url: string): Promise<ExtractedData | null> {
  try {
    console.log(`[Fetch] Fetching: ${url}`);

    // HTTP GET with retry
    const response = await retry(
      () =>
        withTimeout(
          axios.get(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'ja,en;q=0.9',
            },
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: (status) => status < 400, // 4xx以上はエラー
          }),
          30000
        ),
      {
        maxAttempts: 3,
        initialDelay: 1000,
      }
    );

    // Content-Typeチェック
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      console.warn(`[Fetch] Skipping non-HTML content: ${url}`);
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // メタデータ抽出
    const title = extractTitle($);
    const publishedDate = extractPublishedDate($);
    const updatedDate = extractUpdatedDate($);
    const { lang, region } = detectLangRegion($, url);

    // 本文抽出
    const content = extractMainContent($);

    // 本文長チェック（400文字未満は除外）
    if (content.length < 400) {
      console.warn(`[Fetch] Content too short (${content.length} chars): ${url}`);
      return null;
    }

    // 最大6000文字にトリム
    const trimmedContent = content.substring(0, 6000);

    const urlObj = new URL(url);

    return {
      url,
      host: urlObj.hostname,
      title,
      content: trimmedContent,
      publishedDate,
      updatedDate,
      detectedLang: lang,
      detectedRegion: region,
    };
  } catch (error: any) {
    console.error(`[Fetch] Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * タイトル抽出
 */
function extractTitle($: cheerio.CheerioAPI): string {
  // og:title > meta title > h1 > title tag
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();

  const metaTitle = $('meta[name="title"]').attr('content');
  if (metaTitle) return metaTitle.trim();

  const h1 = $('h1').first().text();
  if (h1) return h1.trim();

  return $('title').text().trim();
}

/**
 * 公開日抽出
 */
function extractPublishedDate($: cheerio.CheerioAPI): string | undefined {
  // meta[article:published_time, og:published_time, date, pubdate]
  const metaPublished =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[property="og:published_time"]').attr('content') ||
    $('meta[name="date"]').attr('content') ||
    $('meta[name="pubdate"]').attr('content');

  if (metaPublished) {
    return normalizeDate(metaPublished);
  }

  // <time datetime>
  const timeTag = $('time[datetime]').first().attr('datetime');
  if (timeTag) {
    return normalizeDate(timeTag);
  }

  return undefined;
}

/**
 * 更新日抽出
 */
function extractUpdatedDate($: cheerio.CheerioAPI): string | undefined {
  const metaUpdated =
    $('meta[property="article:modified_time"]').attr('content') ||
    $('meta[property="og:updated_time"]').attr('content') ||
    $('meta[name="last-modified"]').attr('content');

  if (metaUpdated) {
    return normalizeDate(metaUpdated);
  }

  return undefined;
}

/**
 * 日付を YYYY-MM-DD 形式に正規化
 */
function normalizeDate(dateString: string): string | undefined {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
}

/**
 * 言語・地域検出
 */
function detectLangRegion(
  $: cheerio.CheerioAPI,
  url: string
): { lang: string; region: string } {
  // HTMLのlang属性
  const htmlLang = $('html').attr('lang');

  // meta[og:locale]
  const ogLocale = $('meta[property="og:locale"]').attr('content');

  // TLDベースの推定
  const urlObj = new URL(url);
  const tld = urlObj.hostname.split('.').pop();

  let lang = 'en';
  let region = 'Global';

  if (htmlLang?.startsWith('ja') || tld === 'jp') {
    lang = '日本語';
    region = 'JP';
  } else if (tld === 'in') {
    lang = 'English';
    region = 'India';
  } else if (tld === 'sg') {
    lang = 'English';
    region = 'Singapore';
  } else if (['de', 'fr', 'it', 'es'].includes(tld || '')) {
    lang = '欧州言語';
    region = 'EU';
  } else if (ogLocale?.startsWith('ja')) {
    lang = '日本語';
    region = 'JP';
  }

  return { lang, region };
}

/**
 * 本文抽出（簡易Readability風）
 */
function extractMainContent($: cheerio.CheerioAPI): string {
  // 不要タグを削除
  $('script, style, nav, header, footer, aside, iframe, noscript').remove();

  // 本文候補タグ
  const candidates = ['article', 'main', '.content', '.post', '.entry', 'body'];

  for (const selector of candidates) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text();
      if (text.length > 400) {
        return cleanText(text);
      }
    }
  }

  // フォールバック: body全体
  return cleanText($('body').text());
}

/**
 * テキストクリーニング
 */
function cleanText(text: string): string {
  return (
    text
      .replace(/\s+/g, ' ') // 連続空白を1つに
      .replace(/\n+/g, '\n') // 連続改行を1つに
      .trim()
  );
}
