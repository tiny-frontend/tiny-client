import "@ungap/global-this";

const loadUmdBundlesPromiseCacheMap = new Map<string, Promise<unknown>>();

export const loadUmdBundle = async <T>(
  bundleUrl: string,
  dependenciesMap: Record<string, unknown>
): Promise<T> => {
  if (loadUmdBundlesPromiseCacheMap.has(bundleUrl)) {
    return (await loadUmdBundlesPromiseCacheMap.get(bundleUrl)) as Promise<T>;
  }

  const modulePromise = loadUmdBundleInternal<T>(bundleUrl, dependenciesMap);
  loadUmdBundlesPromiseCacheMap.set(bundleUrl, modulePromise);

  return modulePromise;
};

const loadUmdBundleInternal = async <T>(
  bundleUrl: string,
  dependenciesMap: Record<string, unknown>
): Promise<T> => {
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
    if (typeof document !== "undefined") {
      await loadBundleCodeUsingScriptTag(bundleUrl);
    } else {
      await loadBundleCodeUsingEval(bundleUrl);
    }
  } catch (err) {
    throw new Error("Error while loading script for umd bundle");
  } finally {
    globalThis.define = previousDefine;
  }

  if (!module) {
    throw new Error("Couldn't load umd bundle");
  }

  return module;
};

const loadBundleCodeUsingEval = async (bundleUrl: string) => {
  const response = await fetch(bundleUrl);
  new Function(await response.text())();
};

const loadBundleCodeUsingScriptTag = async (bundleUrl: string) => {
  return new Promise<void>((resolve, reject) => {
    const scriptTag = document.createElement("script");
    scriptTag.addEventListener("load", () => resolve());
    scriptTag.addEventListener("error", () => reject());
    scriptTag.src = bundleUrl;
    document.body.appendChild(scriptTag);
  });
};

declare global {
  function define(
    deps: string[],
    moduleFactory: (...args: unknown[]) => any
  ): void;
}
