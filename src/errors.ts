export class TinyClientFetchError extends Error {
  constructor(
    tinyFrontendName: string,
    contractVersion: string,
    message: string
  ) {
    super(
      `Failed to fetch tiny frontend ${tinyFrontendName} version ${contractVersion} from API, ${message}`
    );
    this.name = "TinyClientFetchError";
  }
}

export class TinyClientLoadBundleError extends Error {
  constructor(tinyFrontendName: string) {
    super(`Failed to load script for tiny frontend ${tinyFrontendName}`);
    this.name = "TinyClientLoadBundleError";
  }
}
