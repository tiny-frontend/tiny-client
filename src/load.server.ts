import "@ungap/global-this";

import { SmolClientLoadBundleError } from "./errors";
import { LoadSmolFrontendOptions } from "./types";
import { getSmolFrontendModuleConfig } from "./utils/getSmolFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

interface SmolFrontendServerResponse<T> {
  smolFrontend: T;
  smolFrontendStringToAddToSsrResult: string;
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

    const smolFrontendStringToAddToSsrResult = `
${cssBundleUrl ? `<link rel="stylesheet" href="${cssBundleUrl}">` : ""}
<link rel="preload" href="${umdBundleUrl}" as="script">
<script>
window["smolFrontend${name}Config"] = ${JSON.stringify(
      smolFrontendModuleConfig
    )}
</script>
`;
    return {
      smolFrontend,
      smolFrontendStringToAddToSsrResult,
    };
  } catch (err) {
    console.error(err);
    throw new SmolClientLoadBundleError(name);
  }
};
