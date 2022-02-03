import { SmolClientLoadBundleError } from "./errors";
import { LoadSmolFrontendOptions, SmolFrontendModuleConfig } from "./types";
import { getSmolFrontendModuleConfig } from "./utils/getSmolFrontendModuleConfig";
import { loadUmdBundle } from "./utils/loadUmdBundle";

type CapturedUmdModule<T> = [string[], (...deps: unknown[]) => T];

export const loadSmolFrontendClient = async <T>({
  name,
  contractVersion,
  smolApiEndpoint,
  dependenciesMap = {},
}: LoadSmolFrontendOptions): Promise<T> => {
  const capturedSmolFrontendUmdModule = (
    window as unknown as Record<string, CapturedUmdModule<T>>
  )[`smolFrontend${name}`];
  if (capturedSmolFrontendUmdModule) {
    return loadCapturedSmolFrontendUmdModule(
      capturedSmolFrontendUmdModule,
      dependenciesMap
    );
  }

  const smolFrontendModuleConfigFromSsr = (
    window as unknown as Record<string, SmolFrontendModuleConfig | undefined>
  )[`smolFrontend${name}Config`];

  const smolFrontendModuleConfig =
    smolFrontendModuleConfigFromSsr ??
    (await getSmolFrontendModuleConfig(name, contractVersion, smolApiEndpoint));

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

const loadCapturedSmolFrontendUmdModule = <T>(
  capturedSmolFrontendUmdModule: CapturedUmdModule<T>,
  dependenciesMap: Record<string, unknown>
): T => {
  const [moduleDeps, module] = capturedSmolFrontendUmdModule;
  return module(...moduleDeps.map((dep) => dependenciesMap[dep]));
};
