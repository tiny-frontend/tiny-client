import { RetryPolicy } from "./utils/retry";

export interface LoadingOptions {
  cacheTtlInMs?: number;
  retryPolicy?: RetryPolicy;
}

export interface LoadTinyFrontendOptions {
  name: string;
  contractVersion: string;
  tinyApiEndpoint: string;
  dependenciesMap?: Record<string, unknown>;
  loadingOptions?: LoadingOptions;
}

export interface TinyFrontendModuleConfig {
  umdBundle: string;
  cssBundle?: string;
}

export interface TinyFrontendSsrConfig {
  jsBundle: string;
  moduleConfigScript: string;
  cssBundle?: string;
}
