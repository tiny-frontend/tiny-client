import { SmolClientFetchError } from "../errors";
import { SmolFrontendModuleConfig } from "../types";

export const getSmolFrontendModuleConfig = async (
  libraryName: string,
  libraryVersion: string,
  hostname: string
): Promise<SmolFrontendModuleConfig> => {
  let response;

  try {
    response = await fetch(
      `${hostname}/smol/latest/${libraryName}/${libraryVersion}`,
      { mode: "cors" }
    );
  } catch (err) {
    throw new SmolClientFetchError(
      libraryName,
      libraryVersion,
      `with error: ${(err as Record<string, string>)?.message}`
    );
  }

  if (response.status >= 400) {
    throw new SmolClientFetchError(
      libraryName,
      libraryVersion,
      `with status ${response.status} and body '${await response.text()}'`
    );
  }

  let responseJson: SmolFrontendModuleConfig;

  try {
    responseJson = await response.json();
  } catch (err) {
    throw new SmolClientFetchError(
      libraryName,
      libraryVersion,
      `while getting JSON body`
    );
  }

  return responseJson;
};
