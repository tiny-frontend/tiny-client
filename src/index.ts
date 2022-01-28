import "@ungap/global-this";

import fetch from "isomorphic-unfetch";

import {
  SmolClientExportsMissingOnGlobalError,
  SmolClientFetchError,
  SmolClientLoadBundleError,
} from "./errors";
import { loadScript } from "./load-script";

const getSmolFrontendUmdBundleName = async (
  libraryName: string,
  libraryVersion: string,
  hostname: string
): Promise<string> => {
  let response;

  try {
    response = await fetch(
      `${hostname}/smol/latest/${libraryName}/${libraryVersion}`,
      { mode: "cors" }
    );
  } catch (err) {
    throw new SmolClientFetchError(
      libraryName,
      libraryVersion,
      `with error: ${(err as Record<string, string>)?.message}`
    );
  }

  if (response.status >= 400) {
    throw new SmolClientFetchError(
      libraryName,
      libraryVersion,
      `with status ${response.status} and body '${await response.text()}'`
    );
  }

  const responseJson = await response.json();
  return responseJson.umdBundle;
};

interface LoadSmolFrontendOptions {
  name: string;
  contractVersion: string;
  smolApiEndpoint: string;
}

export const loadSmolFrontend = async <T>({
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
    await loadScript(
      `${smolApiEndpoint}/smol/bundle/${smolFrontendUmdBundleName}`
    );
  } catch (err) {
    throw new SmolClientLoadBundleError(name);
  }

  const smolFrontend = (globalThis as unknown as Record<string, T>)[name];
  if (!smolFrontend) {
    throw new SmolClientExportsMissingOnGlobalError(name);
  }

  return smolFrontend;
};
