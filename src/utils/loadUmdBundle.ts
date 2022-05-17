import "@ungap/global-this";

import { retry, RetryPolicy } from "./retry";

interface UmdBundleCacheItem {
  bundleUrl: string;
  promise: Promise<unknown>;
}

export const umdBundlesPromiseCacheMap = new Map<string, UmdBundleCacheItem>();

interface LoadUmdBundleWithCacheProps {
  bundleUrl: string;
  tinyFrontendName: string;
  dependenciesMap: Record<string, unknown>;
  baseCacheKey: string;
  retryPolicy?: RetryPolicy;
}

export const loadUmdBundleServerWithCache = <T>(
  props: LoadUmdBundleWithCacheProps
) =>
  loadUmdBundleWithCache<T>({
    ...props,
    bundleLoader: bundleLoaderServer,
  });

export const loadUmdBundleClientWithCache = <T>(
  props: LoadUmdBundleWithCacheProps
) =>
  loadUmdBundleWithCache<T>({
    ...props,
    bundleLoader: bundleLoaderClient,
  });

const loadUmdBundleWithCache = async <T>({
  bundleUrl,
  tinyFrontendName,
  dependenciesMap,
  baseCacheKey,
  bundleLoader,
  retryPolicy = {
    maxRetries: 0,
    delayInMs: 0,
  },
}: LoadUmdBundleWithCacheProps & {
  bundleLoader: BundleLoader<T>;
}): Promise<T> => {
  const cacheItem = umdBundlesPromiseCacheMap.get(baseCacheKey);
  if (cacheItem && cacheItem.bundleUrl === bundleUrl) {
    return cacheItem.promise as Promise<T>;
  }

  const umdBundlePromise = retry(
    () =>
      bundleLoader({
        bundleUrl,
        dependenciesMap,
        tinyFrontendName,
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

type BundleLoader<T> = (props: BundleLoaderProps) => Promise<T>;

interface BundleLoaderProps {
  bundleUrl: string;
  tinyFrontendName: string;
  dependenciesMap: Record<string, unknown>;
}

const bundleLoaderServer = async <T>({
  bundleUrl,
  dependenciesMap,
}: BundleLoaderProps): Promise<T> => {
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

const bundleLoaderClient = async <T>({
  bundleUrl,
  tinyFrontendName,
  dependenciesMap,
}: BundleLoaderProps): Promise<T> => {
  const script = document.createElement("script");
  script.src = bundleUrl;

  const loadPromise = new Promise<T>((resolve, reject) => {
    script.addEventListener("load", () => {
      resolve((window.tinyfeExports as Record<string, T>)[tinyFrontendName]);
    });
    script.addEventListener("error", (event) => {
      reject(event.error);
    });
  });

  window.tinyfeDeps = {
    ...window.tinyfeDeps,
    ...dependenciesMap,
  };

  document.head.appendChild(script);

  return loadPromise;
};

declare global {
  function define(
    deps: string[],
    moduleFactory: (...args: unknown[]) => any
  ): void;

  interface Window {
    tinyfeDeps: Record<string, unknown>;
    tinyfeExports: Record<string, unknown>;
  }
}
