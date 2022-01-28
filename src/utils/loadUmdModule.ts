const loadModulesPromiseMap = new Map<string, Promise<void>>();

export const loadUmdModule = (moduleUrl: string): Promise<void> => {
  if (loadModulesPromiseMap.has(moduleUrl)) {
    return loadModulesPromiseMap.get(moduleUrl) as Promise<void>;
  }

  const loadScriptPromise =
    typeof document !== "undefined"
      ? loadScriptTag(moduleUrl)
      : loadAndEvaluateSource(moduleUrl);
  loadModulesPromiseMap.set(moduleUrl, loadScriptPromise);
  return loadScriptPromise;
};

const loadAndEvaluateSource = async (moduleUrl: string) => {
  const response = await fetch(moduleUrl);
  new Function(await response.text())();
};

const loadScriptTag = async (moduleUrl: string) => {
  return new Promise<void>((resolve, reject) => {
    const scriptTag = document.createElement("script");
    scriptTag.addEventListener("load", () => resolve());
    scriptTag.addEventListener("error", () => reject());
    scriptTag.src = moduleUrl;
    document.body.appendChild(scriptTag);
  });
};
