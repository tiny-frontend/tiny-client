import {
  SmolClientExportsMissingOnGlobalError,
  SmolClientLoadBundleError,
} from "./errors";
import { LoadSmolFrontendOptions } from "./types";
import { getSmolFrontendUmdBundleName } from "./utils/getSmolFrontendUmdBundleName";
import { loadUmdModule } from "./utils/loadUmdModule";

export const loadSmolFrontendClient = async <T>({
  name,
  contractVersion,
  smolApiEndpoint,
}: LoadSmolFrontendOptions): Promise<T> => {
  const smolFrontendUmdBundleName = await getSmolFrontendUmdBundleName(
    name,
    contractVersion,
    smolApiEndpoint
  );

  try {
    await loadUmdModule(
      `${smolApiEndpoint}/smol/bundle/${smolFrontendUmdBundleName}`
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
