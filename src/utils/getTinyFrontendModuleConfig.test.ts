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

    const tinyFrontendModuleConfig = await getTinyFrontendModuleConfig({
      libraryName: "MOCK_LIB_NAME",
      libraryVersion: "MOCK_LIB_VERSION",
      hostname: "https://mock.hostname/api",
    });

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
      getTinyFrontendModuleConfig({
        libraryName: "MOCK_LIB_NAME",
        libraryVersion: "MOCK_LIB_VERSION",
        hostname: "https://mock.hostname/api",
      })
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
      getTinyFrontendModuleConfig({
        libraryName: "MOCK_LIB_NAME",
        libraryVersion: "MOCK_LIB_VERSION",
        hostname: "https://mock.hostname/api",
      })
    ).rejects.toEqual(
      new Error(
        `Failed to fetch tiny frontend MOCK_LIB_NAME version MOCK_LIB_VERSION from API, while getting JSON body`
      )
    );
  });

  it("should retry fetching when passed a retry policy", async () => {
    let count = 0;
    server.use(
      rest.get(
        "https://mock.hostname/api/tiny/latest/MOCK_LIB_NAME/MOCK_LIB_VERSION",
        (_, res, ctx) => {
          if (count === 0) {
            count++;
            return res(ctx.status(400));
          }
          return res(
            ctx.status(200),
            ctx.json({
              umdBundle: "mockBundle.js",
              cssBundle: "mockBundle.css",
            } as TinyFrontendModuleConfig)
          );
        }
      )
    );

    const tinyFrontendModuleConfig = await getTinyFrontendModuleConfig({
      libraryName: "MOCK_LIB_NAME",
      libraryVersion: "MOCK_LIB_VERSION",
      hostname: "https://mock.hostname/api",
      retryPolicy: {
        maxRetries: 1,
        delay: 10,
      },
    });

    expect(tinyFrontendModuleConfig).toEqual({
      umdBundle: "mockBundle.js",
      cssBundle: "mockBundle.css",
    });
  });

  describe("when multiple request are done at the same time", () => {
    it("should only query the config once", async () => {
      let count = 0;
      server.use(
        rest.get(
          "https://mock.hostname/api/tiny/latest/MOCK_LIB_NAME/MOCK_LIB_VERSION",
          (_, res, ctx) => {
            count++;

            return res(
              ctx.status(200),
              ctx.json({
                umdBundle: "mockBundle.js",
                cssBundle: "mockBundle.css",
              } as TinyFrontendModuleConfig)
            );
          }
        )
      );

      const getTinyFrontendModuleConfigProps = {
        libraryName: "MOCK_LIB_NAME",
        libraryVersion: "MOCK_LIB_VERSION",
        hostname: "https://mock.hostname/api",
        retryPolicy: {
          maxRetries: 1,
          delay: 10,
        },
      };

      await Promise.all([
        getTinyFrontendModuleConfig(getTinyFrontendModuleConfigProps),
        getTinyFrontendModuleConfig(getTinyFrontendModuleConfigProps),
        getTinyFrontendModuleConfig(getTinyFrontendModuleConfigProps),
        getTinyFrontendModuleConfig(getTinyFrontendModuleConfigProps),
      ]);

      expect(count).toEqual(1);
    });
  });
});
