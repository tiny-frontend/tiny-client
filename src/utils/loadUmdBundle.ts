import "@ungap/global-this";

const umdBundlesPromiseCacheMap = new Map<string, Promise<unknown>>();

export const loadUmdBundle = async <T>(
  bundleUrl: string,
  dependenciesMap: Record<string, unknown>
): Promise<T> => {
  if (umdBundlesPromiseCacheMap.has(bundleUrl)) {
    return (await umdBundlesPromiseCacheMap.get(bundleUrl)) as Promise<T>;
  }

  const umdBundlePromise = loadUmdBundleWithoutCache<T>(
    bundleUrl,
    dependenciesMap
  );
  umdBundlesPromiseCacheMap.set(bundleUrl, umdBundlePromise);

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
