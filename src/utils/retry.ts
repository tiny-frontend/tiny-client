export interface RetryPolicy {
  maxRetries: number;
  delayInMs: number;
}

const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const retry = async <T>(
  fnToRetry: () => Promise<T>,
  retryPolicy: RetryPolicy
): Promise<T> => {
  const { maxRetries, delayInMs } = retryPolicy;
  const onError = (error: Error) => {
    if (maxRetries <= 0) {
      throw error;
    }

    return wait(delayInMs).then(() =>
      retry(fnToRetry, {
        delayInMs: delayInMs * 2,
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
