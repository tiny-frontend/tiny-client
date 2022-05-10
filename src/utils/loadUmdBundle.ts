import "@ungap/global-this";

import { retry, RetryPolicy } from "./retry";

interface UmdBundleCacheItem {
  bundleUrl: string;
  promise: Promise<unknown>;
}

export const umdBundlesPromiseCacheMap = new Map<string, UmdBundleCacheItem>();

interface LoadUmdBundleProps {
  bundleUrl: string;
  dependenciesMap: Record<string, unknown>;
  baseCacheKey: string;
  retryPolicy?: RetryPolicy;
}

export const loadUmdBundle = async <T>({
  bundleUrl,
  dependenciesMap,
  baseCacheKey,
  retryPolicy = {
    maxRetries: 0,
    delayInMs: 0,
  },
}: LoadUmdBundleProps): Promise<T> => {
  const cacheItem = umdBundlesPromiseCacheMap.get(baseCacheKey);
  if (cacheItem && cacheItem.bundleUrl === bundleUrl) {
    return cacheItem.promise as Promise<T>;
  }

  const umdBundlePromise = retry(
    () =>
      loadUmdBundleWithoutCache<T>({
        bundleUrl,
        dependenciesMap,
      }),
    retryPolicy
  ).catch((err) => {
    umdBundlesPromiseCacheMap.delete(baseCacheKey);
    throw err;
  });

  umdBundlesPromiseCacheMap.set(baseCacheKey, {
    bundleUrl,
    promise: umdBundlePromise,
  });

  return umdBundlePromise;
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
    throw new Error(
      `Failed to fetch umd bundle at URL ${bundleUrl} with status ${umdBundleSourceResponse.status}`
    );
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
