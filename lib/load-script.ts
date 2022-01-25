const loadScriptsPromiseMap = new Map<string, Promise<void>>();

export const loadScript = (scriptPath: string): Promise<void> => {
  if (loadScriptsPromiseMap.has(scriptPath)) {
    return loadScriptsPromiseMap.get(scriptPath) as Promise<void>;
  }

  const loadScriptPromise = new Promise<void>((resolve, reject) => {
    const scriptTag = document.createElement("script");
    scriptTag.addEventListener("load", () => resolve());
    scriptTag.addEventListener("error", () => reject());
    scriptTag.src = scriptPath;
    document.body.appendChild(scriptTag);
  });

  loadScriptsPromiseMap.set(scriptPath, loadScriptPromise);
  return loadScriptPromise;
};
