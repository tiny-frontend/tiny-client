import { TinyClientFetchError } from "../errors";
import { TinyFrontendModuleConfig } from "../types";
import { retry, RetryPolicy } from "./retry";

interface GetTinyFrontendModuleConfigProps
  extends GetTinyFrontendModuleConfigBaseProps {
  cacheTtlInMs?: number;
  retryPolicy?: RetryPolicy;
}

interface ModuleConfigCacheItem {
  promise: Promise<TinyFrontendModuleConfig>;
  timestamp: number;
}

const isCacheItemValid = ({
  timestamp,
  ttlInMs,
}: {
  timestamp: number;
  ttlInMs?: number;
}) => ttlInMs == null || Date.now() - timestamp < ttlInMs;

export const moduleConfigPromiseCacheMap = new Map<
  string,
  ModuleConfigCacheItem
>();

export const getTinyFrontendModuleConfig = async ({
  tinyFrontendName,
  contractVersion,
  hostname,
  retryPolicy = {
    maxRetries: 0,
    delayInMs: 0,
  },
  cacheTtlInMs,
}: GetTinyFrontendModuleConfigProps): Promise<TinyFrontendModuleConfig> => {
  const cacheKey = `${tinyFrontendName}-${contractVersion}-${hostname}`;

  const cacheItem = moduleConfigPromiseCacheMap.get(cacheKey);
  if (
    cacheItem &&
    isCacheItemValid({
      ttlInMs: cacheTtlInMs,
      timestamp: cacheItem.timestamp,
    })
  ) {
    return cacheItem.promise;
  }

  const moduleConfigPromise = retry(
    () =>
      getTinyFrontendModuleConfigBase({
        tinyFrontendName,
        contractVersion: contractVersion,
        hostname,
      }),
    retryPolicy
  ).catch((err) => {
    moduleConfigPromiseCacheMap.delete(cacheKey);
    throw err;
  });

  moduleConfigPromiseCacheMap.set(cacheKey, {
    promise: moduleConfigPromise,
    timestamp: Date.now(),
  });

  return moduleConfigPromise;
};

interface GetTinyFrontendModuleConfigBaseProps {
  tinyFrontendName: string;
  contractVersion: string;
  hostname: string;
  retryPolicy?: RetryPolicy;
}

const getTinyFrontendModuleConfigBase = async ({
  tinyFrontendName,
  contractVersion,
  hostname,
}: GetTinyFrontendModuleConfigBaseProps): Promise<TinyFrontendModuleConfig> => {
  let response;

  try {
    response = await fetch(
      `${hostname}/tiny/latest/${tinyFrontendName}/${contractVersion}`,
      { mode: "cors" }
    );
  } catch (err) {
    throw new TinyClientFetchError(
      tinyFrontendName,
      contractVersion,
      `with error: ${(err as Record<string, string>)?.message}`
    );
  }

  if (response.status >= 400) {
    throw new TinyClientFetchError(
      tinyFrontendName,
      contractVersion,
      `with status ${response.status} and body '${await response.text()}'`
    );
  }

  let responseJson: TinyFrontendModuleConfig;

  try {
    responseJson = await response.json();
  } catch (err) {
    throw new TinyClientFetchError(
      tinyFrontendName,
      contractVersion,
      `while getting JSON body`
    );
  }

  return responseJson;
};
