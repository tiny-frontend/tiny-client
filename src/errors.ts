export class TinyClientFetchError extends Error {
  constructor(libraryName: string, libraryVersion: string, message: string) {
    super(
      `Failed to fetch tiny frontend ${libraryName} version ${libraryVersion} from API, ${message}`
    );
    this.name = "TinyClientFetchError";
  }
}

export class TinyClientLoadBundleError extends Error {
  constructor(libraryName: string) {
    super(`Failed to load script for tiny frontend ${libraryName}`);
    this.name = "TinyClientLoadBundleError";
  }
}
