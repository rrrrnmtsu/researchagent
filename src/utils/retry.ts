/**
 * 指数バックオフによるリトライユーティリティ
 */
export interface RetryOptions {
  maxAttempts?: number; // デフォルト: 3
  initialDelay?: number; // デフォルト: 1000ms
  maxDelay?: number; // デフォルト: 10000ms
  factor?: number; // デフォルト: 2 (指数)
  retryOn?: (error: any) => boolean; // リトライ条件
}

const defaultRetryOn = (error: any): boolean => {
  // 5xx, 429, ネットワークエラーでリトライ
  if (error.response) {
    const status = error.response.status;
    return status >= 500 || status === 429;
  }
  // ネットワークエラー（ECONNRESET, ETIMEDOUT等）
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  return false;
};

/**
 * 指数バックオフでリトライを実行
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    retryOn = defaultRetryOn,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最後の試行またはリトライ条件を満たさない場合は即座にエラー
      if (attempt === maxAttempts - 1 || !retryOn(error)) {
        throw error;
      }

      // バックオフ遅延計算
      const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxAttempts} failed. Retrying in ${delay}ms...`,
        error.message
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * スリープユーティリティ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * タイムアウト付き関数実行
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
