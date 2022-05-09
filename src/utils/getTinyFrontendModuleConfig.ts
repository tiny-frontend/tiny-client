import { TinyClientFetchError } from "../errors";
import { TinyFrontendModuleConfig } from "../types";

interface GetTinyFrontendModuleConfigProps {
  libraryName: string;
  libraryVersion: string;
  hostname: string;
}

export const getTinyFrontendModuleConfig = async ({
  libraryName,
  libraryVersion,
  hostname,
}: GetTinyFrontendModuleConfigProps): Promise<TinyFrontendModuleConfig> => {
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
