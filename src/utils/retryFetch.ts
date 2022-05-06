import { RetryOptions } from "./loadUmdBundle";

const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const retryFetch = async <T>({
  loader,
  options,
}: {
  loader: () => Promise<T>;
  options: RetryOptions;
}): Promise<T> => {
  const { maxRetries, delay } = options;
  const onError = (error: Error) => {
    const triesLeft = maxRetries - 1;
    if (!triesLeft) {
      throw error;
    }

    return wait(delay).then(() =>
      retryFetch({
        options: {
          delay: delay * 2,
          maxRetries: triesLeft,
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
