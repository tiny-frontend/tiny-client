import {
  SmolClientExportsMissingOnGlobalError,
  SmolClientLoadBundleError,
} from "./errors";
import { LoadSmolFrontendOptions, SmolFrontendModuleConfig } from "./types";
import { getSmolFrontendModuleConfig } from "./utils/getSmolFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

export const loadSmolFrontendClient = async <T>({
  name,
  contractVersion,
  smolApiEndpoint,
}: LoadSmolFrontendOptions): Promise<T> => {
  const smolFrontendModuleConfigFromSsr = (
    window as unknown as Record<string, SmolFrontendModuleConfig | undefined>
  )[`smolFrontend${name}Config`];

  const smolFrontendModuleConfig =
    smolFrontendModuleConfigFromSsr ??
    (await getSmolFrontendModuleConfig(name, contractVersion, smolApiEndpoint));

  try {
    await loadUmdBundle(
      `${smolApiEndpoint}/smol/bundle/${smolFrontendModuleConfig.umdBundle}`
    );
  } catch (err) {
    console.error(err);
    throw new SmolClientLoadBundleError(name);
  }

  const smolFrontend = (globalThis as unknown as Record<string, T>)[name];
  if (!smolFrontend) {
    throw new SmolClientExportsMissingOnGlobalError(name);
  }

  return smolFrontend;
};
