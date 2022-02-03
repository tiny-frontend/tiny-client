import { SmolClientLoadBundleError } from "./errors";
import { LoadSmolFrontendOptions, SmolFrontendModuleConfig } from "./types";
import { getSmolFrontendModuleConfig } from "./utils/getSmolFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

export const loadSmolFrontendClient = async <T>({
  name,
  contractVersion,
  smolApiEndpoint,
  dependenciesMap = {},
}: LoadSmolFrontendOptions): Promise<T> => {
  const smolFrontendModuleConfigFromSsr = (
    window as unknown as Record<string, SmolFrontendModuleConfig | undefined>
  )[`smolFrontend${name}Config`];

  const smolFrontendModuleConfig =
    smolFrontendModuleConfigFromSsr ??
    (await getSmolFrontendModuleConfig(name, contractVersion, smolApiEndpoint));

  if (smolFrontendModuleConfig.cssBundle) {
    const cssBundleUrl = `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.cssBundle}`;
    if (!hasStylesheet(cssBundleUrl)) {
      const cssElement = document.createElement("link");
      cssElement.rel = "stylesheet";
      cssElement.href = cssBundleUrl;
      document.head.appendChild(cssElement);
    }
  }

  try {
    return await loadUmdBundle(
      `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.umdBundle}`,
      dependenciesMap
    );
  } catch (err) {
    console.error(err);
    throw new SmolClientLoadBundleError(name);
  }
};

const hasStylesheet = (stylesheetHref: string): boolean =>
  !!document.querySelector(`link[rel="stylesheet"][href="${stylesheetHref}"]`);
