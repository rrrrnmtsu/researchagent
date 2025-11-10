import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ResearchTemplate } from './types.js';

/**
 * Template Loader
 * YAMLテンプレートファイルを読み込んで検証する
 */
export class TemplateLoader {
  /**
   * テンプレートディレクトリからテンプレートを読み込む
   * @param templatePath テンプレートディレクトリのパス（例: templates/n8n）
   * @returns ResearchTemplate
   */
  static loadTemplate(templatePath: string): ResearchTemplate {
    const templateFile = join(templatePath, 'template.yaml');

    if (!existsSync(templateFile)) {
      throw new Error(`Template file not found: ${templateFile}`);
    }

    try {
      const content = readFileSync(templateFile, 'utf-8');
      const template = yaml.load(content) as ResearchTemplate;

      // 基本的なバリデーション
      this.validateTemplate(template);

      return template;
    } catch (error: any) {
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * テンプレートの妥当性を検証
   */
  private static validateTemplate(template: ResearchTemplate): void {
    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!template.version) {
      throw new Error('Template version is required');
    }

    if (!template.search || !template.search.queries) {
      throw new Error('Search queries are required');
    }

    if (!template.schema || !template.schema.fields || template.schema.fields.length === 0) {
      throw new Error('Schema fields are required');
    }

    if (!template.extraction || !template.extraction.system_prompt) {
      throw new Error('Extraction system_prompt is required');
    }

    if (!template.extraction.user_prompt_template) {
      throw new Error('Extraction user_prompt_template is required');
    }

    // フィールド定義のチェック
    for (const field of template.schema.fields) {
      if (!field.name || !field.type) {
        throw new Error(`Invalid field definition: ${JSON.stringify(field)}`);
      }
    }
  }

  /**
   * テンプレート名からパスを解決
   * @param templateName テンプレート名（例: "n8n"）
   * @returns テンプレートディレクトリのフルパス
   */
  static resolveTemplatePath(templateName: string): string {
    // templates/ ディレクトリからの相対パス
    const basePath = join(process.cwd(), 'templates', templateName);

    if (!existsSync(basePath)) {
      throw new Error(`Template directory not found: ${basePath}`);
    }

    return basePath;
  }

  /**
   * 利用可能なテンプレート一覧を取得
   */
  static listTemplates(): string[] {
    const templatesDir = join(process.cwd(), 'templates');

    if (!existsSync(templatesDir)) {
      return [];
    }

    const { readdirSync, statSync } = require('fs');
    const entries = readdirSync(templatesDir);

    return entries.filter((entry: string) => {
      const fullPath = join(templatesDir, entry);
      const stat = statSync(fullPath);
      return stat.isDirectory() && existsSync(join(fullPath, 'template.yaml'));
    });
  }
}
