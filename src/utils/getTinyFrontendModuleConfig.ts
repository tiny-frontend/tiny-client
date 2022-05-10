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
  libraryName,
  libraryVersion,
  hostname,
  retryPolicy = {
    maxRetries: 0,
    delayInMs: 0,
  },
  cacheTtlInMs,
}: GetTinyFrontendModuleConfigProps): Promise<TinyFrontendModuleConfig> => {
  const cacheKey = `${libraryName}-${libraryVersion}-${hostname}`;

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
        libraryName,
        libraryVersion,
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
  libraryName: string;
  libraryVersion: string;
  hostname: string;
  retryPolicy?: RetryPolicy;
}

const getTinyFrontendModuleConfigBase = async ({
  libraryName,
  libraryVersion,
  hostname,
}: GetTinyFrontendModuleConfigBaseProps): Promise<TinyFrontendModuleConfig> => {
  let response;

  try {
    response = await fetch(
      `${hostname}/tiny/latest/${libraryName}/${libraryVersion}`,
      { mode: "cors" }
    );
  } catch (err) {
    throw new TinyClientFetchError(
      libraryName,
      libraryVersion,
      `with error: ${(err as Record<string, string>)?.message}`
    );
  }

  if (response.status >= 400) {
    throw new TinyClientFetchError(
      libraryName,
      libraryVersion,
      `with status ${response.status} and body '${await response.text()}'`
    );
  }

  let responseJson: TinyFrontendModuleConfig;

  try {
    responseJson = await response.json();
  } catch (err) {
    throw new TinyClientFetchError(
      libraryName,
      libraryVersion,
      `while getting JSON body`
    );
  }

  return responseJson;
};
