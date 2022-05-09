export interface RetryPolicy {
  maxRetries: number;
  delay: number;
}

const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const retry = async <T>(
  fnToRetry: () => Promise<T>,
  retryPolicy: RetryPolicy
): Promise<T> => {
  const { maxRetries, delay } = retryPolicy;
  const onError = (error: Error) => {
    if (maxRetries <= 0) {
      throw error;
    }

    return wait(delay).then(() =>
      retry(fnToRetry, {
        delay: delay * 2,
        maxRetries: maxRetries - 1,
      })
    );
  };
  try {
    return await fnToRetry();
  } catch (error) {
    return onError(error as Error);
  }
};
