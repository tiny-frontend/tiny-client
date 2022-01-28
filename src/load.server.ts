import "@ungap/global-this";

import {
  SmolClientExportsMissingOnGlobalError,
  SmolClientLoadBundleError,
} from "./errors";
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
}: LoadSmolFrontendOptions): Promise<SmolFrontendServerResponse<T>> => {
  const smolFrontendModuleConfig = await getSmolFrontendModuleConfig(
    name,
    contractVersion,
    smolApiEndpoint
  );

  const umdModuleUrl = `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.umdBundle}`;

  try {
    await loadUmdBundle(umdModuleUrl);
  } catch (err) {
    console.error(err);
    throw new SmolClientLoadBundleError(name);
  }

  const smolFrontend = (globalThis as unknown as Record<string, T>)[name];
  if (!smolFrontend) {
    throw new SmolClientExportsMissingOnGlobalError(name);
  }

  const smolFrontendScriptTagToAddToSsrResult = `
<script>
window.smolFrontendBackupDefine = window.define;
window.define = function (deps, module) {
  window["smolFrontend${name}"] = [deps, module];
}
window.define.amd = true
</script>
<script src="${umdModuleUrl}"></script>
<script>
window.define = window.smolFrontendBackupDefine;
</script>
`;
  return { smolFrontend, smolFrontendScriptTagToAddToSsrResult };
};
