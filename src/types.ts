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

export interface TinyFrontendSsrConfig {
  jsBundle: string;
  moduleConfigScript: string;
  cssBundle?: string;
}
