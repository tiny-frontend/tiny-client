export interface RetryPolicy {
  maxRetries: number;
  delay: number;
}

const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const retryFetch = async <T>({
  loader,
  retryPolicy,
}: {
  loader: () => Promise<T>;
  retryPolicy: RetryPolicy;
}): Promise<T> => {
  const { maxRetries, delay } = retryPolicy;
  const onError = (error: Error) => {
    if (maxRetries <= 0) {
      throw error;
    }

    return wait(delay).then(() =>
      retryFetch({
        retryPolicy: {
          delay: delay * 2,
          maxRetries: maxRetries - 1,
        },
        loader,
      })
    );
  };
  try {
    return await loader();
  } catch (error) {
    return onError(error as Error);
  }
};
