/**
 * Research Template Framework Types
 */

export interface ResearchTemplate {
  name: string;
  version: string;
  description: string;
  author?: string;

  search: SearchConfig;
  schema: SchemaConfig;
  extraction: ExtractionConfig;
  normalization: NormalizationConfig;
  output: OutputConfig;
  execution: ExecutionConfig;
}

export interface SearchConfig {
  queries: {
    [lang: string]: string[];
  };
  priority_domains: string[];
  blocked_domains: string[];
  primary_info_domains: string[];
}

export interface SchemaConfig {
  record_name: string;
  deduplication_key: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  required: boolean;
  description?: string;
  values?: string[]; // For enum types
  default?: any;
}

export interface ExtractionConfig {
  system_prompt: string;
  user_prompt_template: string;
}

export interface NormalizationConfig {
  deduplication_strategy: 'key_based' | 'similarity' | 'hybrid';
  industry_mappings?: Record<string, string[]>;
  [key: string]: any;
}

export interface OutputConfig {
  formats: OutputFormat[];
  custom_outputs?: CustomOutput[];
}

export interface OutputFormat {
  type: 'markdown_table' | 'csv' | 'pivot' | 'top_records' | 'json';
  rows_per_section?: number;
  include_csv?: boolean;
  encoding?: string;
  dimensions?: string[];
  sort_by?: string;
  limit?: number;
}

export interface CustomOutput {
  name: string;
  condition?: string;
  filter_fields?: string[];
  filter_values?: any[];
}

export interface ExecutionConfig {
  default_phase?: number;
  default_target_rows: number;
  default_concurrency: number;
  default_per_query: number;
  max_content_length: number;
}

/**
 * Runtime execution options
 */
export interface ResearchExecutionOptions {
  template: string; // Template directory path
  phase?: number;
  targetRows?: number;
  focusValues?: string[];
  outPrefix: string;
  concurrency?: number;
  perQuery?: number;
}

/**
 * Generic record type
 */
export type GenericRecord = Record<string, any>;

/**
 * Search result
 */
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Extracted data
 */
export interface ExtractedData {
  url: string;
  host: string;
  title: string;
  content: string;
  publishedDate?: string;
  updatedDate?: string;
  detectedLang?: string;
  detectedRegion?: string;
}

/**
 * Process log
 */
export interface ProcessLog {
  url: string;
  host: string;
  time_sec: number;
  info_type?: string;
  detected_date?: string;
  prefer_score?: number;
  status: 'success' | 'failed' | 'skipped' | 'duplicate';
  reason?: string;
}
