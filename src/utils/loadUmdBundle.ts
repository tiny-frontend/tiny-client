import "@ungap/global-this";

import { retry, RetryPolicy } from "./retry";

interface UmdBundleCacheItem {
  promise: Promise<unknown>;
  timestamp: number;
}

const umdBundlesPromiseCacheMap = new Map<string, UmdBundleCacheItem>();

const isCacheItemValid = ({
  timestamp,
  ttlInMs,
}: {
  timestamp: number;
  ttlInMs?: number;
}) => ttlInMs == null || Date.now() - timestamp < ttlInMs;

interface LoadUmdBundleProps {
  bundleUrl: string;
  dependenciesMap: Record<string, unknown>;
  loadBundleOptions: {
    ttlInMs?: number;
    retryPolicy?: RetryPolicy;
  };
}

export const loadUmdBundle = async <T>({
  bundleUrl,
  dependenciesMap,
  loadBundleOptions = {},
}: LoadUmdBundleProps): Promise<T> => {
  const {
    ttlInMs,
    retryPolicy = {
      maxRetries: 0,
      delay: 0,
    },
  } = loadBundleOptions;

  if (umdBundlesPromiseCacheMap.has(bundleUrl)) {
    const cacheItem = umdBundlesPromiseCacheMap.get(
      bundleUrl
    ) as UmdBundleCacheItem;

    if (isCacheItemValid({ ttlInMs, timestamp: cacheItem.timestamp })) {
      return (await cacheItem.promise) as Promise<T>;
    }
  }

  const umdBundlePromise = retry(
    () =>
      loadUmdBundleWithoutCache<T>({
        bundleUrl,
        dependenciesMap,
      }),
    retryPolicy
  );

  umdBundlesPromiseCacheMap.set(bundleUrl, {
    promise: umdBundlePromise,
    timestamp: Date.now(),
  });

  umdBundlePromise.catch((err) => {
    umdBundlesPromiseCacheMap.delete(bundleUrl);
    throw err;
  });

  return await umdBundlePromise;
};

export const loadUmdBundleWithoutCache = async <T>({
  bundleUrl,
  dependenciesMap,
}: {
  bundleUrl: string;
  dependenciesMap: Record<string, unknown>;
}): Promise<T> => {
  const umdBundleSourceResponse = await fetch(bundleUrl);

  if (umdBundleSourceResponse.status >= 400) {
    throw new Error(`Failed to fetch umd bundle at URL ${bundleUrl}`);
  }

  const umdBundleSource = await umdBundleSourceResponse.text();

  return evalUmdBundle<T>(umdBundleSource, dependenciesMap);
};

const evalUmdBundle = <T>(
  umdBundleSource: string,
  dependenciesMap: Record<string, unknown>
): T => {
  const previousDefine = globalThis.define;

  let module: T | undefined = undefined;
  globalThis.define = (
    dependenciesName: string[],
    moduleFactory: (...args: unknown[]) => T
  ) => {
    module = moduleFactory(
      ...dependenciesName.map((dependencyName) => {
        const dependency = dependenciesMap[dependencyName];
        if (!dependency) {
          console.error(
            `Couldn't find dependency ${dependencyName} in provided dependencies map`,
            dependenciesMap
          );
        }
        return dependency;
      })
    );
  };
  (globalThis.define as unknown as Record<string, boolean>)["amd"] = true;

  try {
    new Function(umdBundleSource)();
  } finally {
    globalThis.define = previousDefine;
  }

  if (!module) {
    throw new Error("Couldn't load umd bundle");
  }

  return module;
};

declare global {
  function define(
    deps: string[],
    moduleFactory: (...args: unknown[]) => any
  ): void;
}
