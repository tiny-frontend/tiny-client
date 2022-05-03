import { LoadUmdBundleOptions } from "./utils/loadUmdBundle";

export interface LoadTinyFrontendOptions {
  name: string;
  contractVersion: string;
  tinyApiEndpoint: string;
  dependenciesMap?: Record<string, unknown>;
  loadUmdBundleOptions?: LoadUmdBundleOptions;
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
