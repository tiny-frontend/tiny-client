export class SmolClientFetchError extends Error {
  constructor(libraryName: string, libraryVersion: string, message: string) {
    super(
      `Failed to fetch smol frontend ${libraryName} version ${libraryVersion} from API, ${message}`
    );
    this.name = "SmolClientFetchError";
  }
}

export class SmolClientLoadBundleError extends Error {
  constructor(libraryName: string) {
    super(`Failed to load script for smol frontend ${libraryName}`);
    this.name = "SmolClientLoadBundleError";
  }
}
