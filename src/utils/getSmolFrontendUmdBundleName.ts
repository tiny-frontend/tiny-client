import { SmolClientFetchError } from "../errors";

export const getSmolFrontendUmdBundleName = async (
  libraryName: string,
  libraryVersion: string,
  hostname: string
): Promise<string> => {
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

  const responseJson = await response.json();
  return responseJson.umdBundle;
};
