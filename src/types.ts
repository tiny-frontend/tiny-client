export interface LoadTinyFrontendOptions {
  name: string;
  contractVersion: string;
  tinyApiEndpoint: string;
  dependenciesMap?: Record<string, unknown>;
}

export interface TinyFrontendModuleConfig {
  umdBundle: string;
  cssBundle?: string;
}
