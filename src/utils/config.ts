import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 設定ファイル読み込みユーティリティ
 */
export class ConfigLoader {
  private static configCache = new Map<string, any>();

  /**
   * JSONファイルを読み込み（キャッシュ対応）
   */
  static loadJson<T>(relativePath: string): T {
    if (this.configCache.has(relativePath)) {
      return this.configCache.get(relativePath) as T;
    }

    const fullPath = join(process.cwd(), relativePath);
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(content);
      this.configCache.set(relativePath, data);
      return data as T;
    } catch (error) {
      throw new Error(`Failed to load config file: ${relativePath}. Error: ${error}`);
    }
  }

  /**
   * クエリ設定を読み込み
   */
  static loadQueries(): { jp: string[]; en: string[] } {
    return this.loadJson<{ jp: string[]; en: string[] }>('config/queries.json');
  }

  /**
   * ドメイン設定を読み込み
   */
  static loadDomains(): {
    priority: string[];
    blocked: string[];
    primary_info_domains: string[];
  } {
    return this.loadJson('config/domains.json');
  }

  /**
   * 業種マッピングを読み込み
   */
  static loadIndustryMappings(): {
    mappings: Record<string, string>;
    industries: string[];
  } {
    return this.loadJson('config/industry-mappings.json');
  }
}
