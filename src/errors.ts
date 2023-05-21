export class TinyClientFetchError extends Error {
  responseBody: string | undefined;

  constructor(
    tinyFrontendName: string,
    contractVersion: string,
    message: string,
    responseBody?: string
  ) {
    super(
      `Failed to fetch tiny frontend ${tinyFrontendName} version ${contractVersion} from API, ${message}`
    );
    this.name = "TinyClientFetchError";
    this.responseBody = responseBody;
  }
}

export class TinyClientLoadBundleError extends Error {
  constructor(tinyFrontendName: string) {
    super(`Failed to load script for tiny frontend ${tinyFrontendName}`);
    this.name = "TinyClientLoadBundleError";
  }
}
