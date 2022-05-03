import "@ungap/global-this";

interface UmdBundleCacheItem {
  promise: Promise<unknown>;
  timestamp: number;
}

const umdBundlesPromiseCacheMap = new Map<string, UmdBundleCacheItem>();

export interface LoadUmdBundleOptions {
  ttlInMs?: number;
}

export const loadUmdBundle = async <T>(
  bundleUrl: string,
  dependenciesMap: Record<string, unknown>,
  options: LoadUmdBundleOptions = {}
): Promise<T> => {
  if (umdBundlesPromiseCacheMap.has(bundleUrl)) {
    const cacheItem = umdBundlesPromiseCacheMap.get(
      bundleUrl
    ) as UmdBundleCacheItem;
    const now = Date.now();

    if (
      options.ttlInMs == null ||
      now - cacheItem.timestamp < options.ttlInMs
    ) {
      return (await cacheItem.promise) as Promise<T>;
    }
  }

  const umdBundlePromise = loadUmdBundleWithoutCache<T>(
    bundleUrl,
    dependenciesMap
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

export const loadUmdBundleWithoutCache = async <T>(
  bundleUrl: string,
  dependenciesMap: Record<string, unknown>
): Promise<T> => {
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
