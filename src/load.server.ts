import "@ungap/global-this";

import { SmolClientLoadBundleError } from "./errors";
import { LoadSmolFrontendOptions } from "./types";
import { getSmolFrontendModuleConfig } from "./utils/getSmolFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

interface SmolFrontendServerResponse<T> {
  smolFrontend: T;
  smolFrontendScriptTagToAddToSsrResult: string;
}

export const loadSmolFrontendServer = async <T>({
  name,
  contractVersion,
  smolApiEndpoint,
  dependenciesMap = {},
}: LoadSmolFrontendOptions): Promise<SmolFrontendServerResponse<T>> => {
  const smolFrontendModuleConfig = await getSmolFrontendModuleConfig(
    name,
    contractVersion,
    smolApiEndpoint
  );

  const umdBundleUrl = `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.umdBundle}`;
  const cssBundleUrl = smolFrontendModuleConfig.cssBundle
    ? `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.cssBundle}`
    : undefined;

  try {
    const smolFrontend = await loadUmdBundle<T>(umdBundleUrl, dependenciesMap);

    const smolFrontendScriptTagToAddToSsrResult = `
${cssBundleUrl ? `<link rel="stylesheet" href="${cssBundleUrl}">` : ""}
<script>
window.smolFrontendBackupDefine = window.define;
window.define = function (deps, module) {
  window["smolFrontend${name}"] = [deps, module];
}
window.define.amd = true
</script>
<script src="${umdBundleUrl}"></script>
<script>
window.define = window.smolFrontendBackupDefine;
</script>
`;
    return { smolFrontend, smolFrontendScriptTagToAddToSsrResult };
  } catch (err) {
    console.error(err);
    throw new SmolClientLoadBundleError(name);
  }
};
