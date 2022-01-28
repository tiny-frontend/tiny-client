export interface LoadSmolFrontendOptions {
  name: string;
  contractVersion: string;
  smolApiEndpoint: string;
  dependenciesMap?: Record<string, unknown>;
}

export interface SmolFrontendModuleConfig {
  umdBundle: string;
}
