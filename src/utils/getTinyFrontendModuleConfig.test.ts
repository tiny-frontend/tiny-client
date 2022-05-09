import { rest } from "msw";

import { server } from "../mocks/server";
import { TinyFrontendModuleConfig } from "../types";
import { getTinyFrontendModuleConfig } from "./getTinyFrontendModuleConfig";

describe("[getTinyFrontendModuleConfig]", () => {
  it("should fetch the latest config and return it", async () => {
    server.use(
      rest.get(
        "https://mock.hostname/api/tiny/latest/MOCK_LIB_NAME/MOCK_LIB_VERSION",
        (_, res, ctx) =>
          res(
            ctx.status(200),
            ctx.json({
              umdBundle: "mockBundle.js",
              cssBundle: "mockBundle.css",
            } as TinyFrontendModuleConfig)
          )
      )
    );

    const tinyFrontendModuleConfig = await getTinyFrontendModuleConfig(
      "MOCK_LIB_NAME",
      "MOCK_LIB_VERSION",
      "https://mock.hostname/api"
    );

    expect(tinyFrontendModuleConfig).toEqual({
      umdBundle: "mockBundle.js",
      cssBundle: "mockBundle.css",
    });
  });

  it.each`
    status
    ${400}
    ${401}
    ${403}
    ${500}
  `("should throw an error on $status", async ({ status }) => {
    server.use(
      rest.get(
        "https://mock.hostname/api/tiny/latest/MOCK_LIB_NAME/MOCK_LIB_VERSION",
        (_, res, ctx) => res(ctx.status(status))
      )
    );

    await expect(
      getTinyFrontendModuleConfig(
        "MOCK_LIB_NAME",
        "MOCK_LIB_VERSION",
        "https://mock.hostname/api"
      )
    ).rejects.toEqual(
      new Error(
        `Failed to fetch tiny frontend MOCK_LIB_NAME version MOCK_LIB_VERSION from API, with status ${status} and body ''`
      )
    );
  });

  it("should throw an error on invalid JSON", async () => {
    server.use(
      rest.get(
        "https://mock.hostname/api/tiny/latest/MOCK_LIB_NAME/MOCK_LIB_VERSION",
        (_, res, ctx) =>
          res(ctx.status(200), ctx.text("THIS IS NOT VALID JSON"))
      )
    );

    await expect(
      getTinyFrontendModuleConfig(
        "MOCK_LIB_NAME",
        "MOCK_LIB_VERSION",
        "https://mock.hostname/api"
      )
    ).rejects.toEqual(
      new Error(
        `Failed to fetch tiny frontend MOCK_LIB_NAME version MOCK_LIB_VERSION from API, while getting JSON body`
      )
    );
  });
});
