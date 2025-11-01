import axios from 'axios';
import { URL } from 'url';
import { SearchResult } from '../types/schema.js';
import { ConfigLoader } from '../utils/config.js';
import { retry, withTimeout } from '../utils/retry.js';
import pLimit from 'p-limit';

/**
 * 検索オプション
 */
export interface SearchOptions {
  perQuery?: number; // 1クエリあたりの最大取得件数
  concurrency?: number; // 並列数
  timeout?: number; // タイムアウト（ms）
}

/**
 * DuckDuckGo検索を実行（HTML scraping方式）
 */
async function searchDuckDuckGo(
  query: string,
  maxResults: number = 20
): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  try {
    const response = await retry(
      () =>
        withTimeout(
          axios.get(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/html',
              'Accept-Language': 'ja,en',
            },
            timeout: 30000,
          }),
          30000
        ),
      {
        maxAttempts: 3,
        initialDelay: 1000,
      }
    );

    const html = response.data;

    // 簡易HTMLパース（正規表現）
    const results: SearchResult[] = [];
    const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/gi;

    let match;
    const urls: string[] = [];
    const titles: string[] = [];

    // URLとタイトルを抽出
    while ((match = linkRegex.exec(html)) !== null && urls.length < maxResults) {
      const href = match[1];
      const title = match[2];

      // DDG redirectを除去
      const cleanUrl = href.startsWith('//duckduckgo.com/l/')
        ? decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] || '')
        : href;

      if (cleanUrl && isValidUrl(cleanUrl)) {
        urls.push(cleanUrl);
        titles.push(title.trim());
      }
    }

    // スニペットを抽出（簡易実装）
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < urls.length) {
      snippets.push(match[1].trim());
    }

    // 結果を結合
    for (let i = 0; i < urls.length; i++) {
      results.push({
        url: urls[i],
        title: titles[i] || '',
        snippet: snippets[i] || '',
      });
    }

    return results;
  } catch (error: any) {
    console.error(`[Search] DuckDuckGo search failed for query "${query}":`, error.message);
    return []; // エラー時は空配列を返す（クラッシュ回避）
  }
}

/**
 * URL妥当性チェック
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * URL正規化（末尾スラッシュ除去、プロトコル統一）
 */
function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    // httpsに統一
    url.protocol = 'https:';
    // 末尾スラッシュ除去
    url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * ドメインスコアリング
 */
function scoreByDomain(url: string, priorityDomains: string[]): number {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;

    // 優先ドメインにマッチするかチェック
    for (let i = 0; i < priorityDomains.length; i++) {
      if (host.includes(priorityDomains[i])) {
        // 優先度が高いほど高スコア（逆順）
        return priorityDomains.length - i;
      }
    }

    return 0; // 優先ドメイン外
  } catch {
    return 0;
  }
}

/**
 * Web検索を実行（複数クエリ対応、優先ドメインでソート、重複除去）
 */
export async function searchWeb(
  queries: string[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { perQuery = 20, concurrency = 6, timeout = 30000 } = options;

  const domainConfig = ConfigLoader.loadDomains();
  const limit = pLimit(concurrency);

  console.log(`[Search] Starting search with ${queries.length} queries...`);

  // 並列検索
  const allResults = await Promise.all(
    queries.map((query) =>
      limit(async () => {
        console.log(`[Search] Searching: "${query}"`);
        const results = await searchDuckDuckGo(query, perQuery);
        console.log(`[Search] Found ${results.length} results for "${query}"`);
        return results;
      })
    )
  );

  // 結果を統合
  const flatResults = allResults.flat();

  // URL正規化と重複除去
  const uniqueUrls = new Map<string, SearchResult>();

  for (const result of flatResults) {
    const normalizedUrl = normalizeUrl(result.url);

    // ブロックリストチェック
    const isBlocked = domainConfig.blocked.some((blocked) =>
      normalizedUrl.includes(blocked)
    );

    if (!isBlocked && !uniqueUrls.has(normalizedUrl)) {
      uniqueUrls.set(normalizedUrl, {
        ...result,
        url: normalizedUrl,
      });
    }
  }

  // 優先ドメインでソート
  const sortedResults = Array.from(uniqueUrls.values()).sort((a, b) => {
    const scoreA = scoreByDomain(a.url, domainConfig.priority);
    const scoreB = scoreByDomain(b.url, domainConfig.priority);
    return scoreB - scoreA; // 降順
  });

  console.log(`[Search] Total unique results: ${sortedResults.length}`);

  return sortedResults;
}
