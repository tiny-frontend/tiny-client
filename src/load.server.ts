import "@ungap/global-this";

import { TinyClientLoadBundleError } from "./errors";
import { LoadTinyFrontendOptions, TinyFrontendSsrConfig } from "./types";
import { getTinyFrontendModuleConfig } from "./utils/getTinyFrontendModuleConfig";
import { loadUmdBundleServerWithCache } from "./utils/loadUmdBundle";

export interface TinyFrontendServerResponse<T> {
  tinyFrontend: T;
  tinyFrontendStringToAddToSsrResult: string;
  tinyFrontendSsrConfig: TinyFrontendSsrConfig;
}

export const loadTinyFrontendServer = async <T>({
  name,
  contractVersion,
  tinyApiEndpoint,
  dependenciesMap = {},
  loadingOptions = {},
}: LoadTinyFrontendOptions): Promise<TinyFrontendServerResponse<T>> => {
  const { retryPolicy, cacheTtlInMs = 2 * 60 * 1_000 } = loadingOptions;

  const tinyFrontendModuleConfig = await getTinyFrontendModuleConfig({
    tinyFrontendName: name,
    contractVersion,
    hostname: tinyApiEndpoint,
    retryPolicy,
    cacheTtlInMs,
  });

  const umdBundleUrl = `${tinyApiEndpoint}/tiny/bundle/${tinyFrontendModuleConfig.umdBundle}`;
  const cssBundleUrl = tinyFrontendModuleConfig.cssBundle
    ? `${tinyApiEndpoint}/tiny/bundle/${tinyFrontendModuleConfig.cssBundle}`
    : undefined;

  try {
    const tinyFrontend = await loadUmdBundleServerWithCache<T>({
      bundleUrl: umdBundleUrl,
      tinyFrontendName: name,
      dependenciesMap,
      baseCacheKey: `${name}-${contractVersion}`,
      retryPolicy,
    });

    const moduleConfigScript = `window["tinyFrontend${name}Config"] = ${JSON.stringify(
      tinyFrontendModuleConfig
    )}`;

    const tinyFrontendStringToAddToSsrResult = `
${cssBundleUrl ? `<link rel="stylesheet" href="${cssBundleUrl}">` : ""}
<link rel="preload" href="${umdBundleUrl}" crossorigin="anonymous">
<script>${moduleConfigScript}</script>`;

    const tinyFrontendSsrConfig: TinyFrontendSsrConfig = {
      cssBundle: cssBundleUrl,
      jsBundle: umdBundleUrl,
      moduleConfigScript,
    };

    return {
      tinyFrontend,
      tinyFrontendStringToAddToSsrResult,
      tinyFrontendSsrConfig,
    };
  } catch (err) {
    console.error(err);
    throw new TinyClientLoadBundleError(name);
  }
};
