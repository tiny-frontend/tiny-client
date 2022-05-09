import { rest } from "msw";

import { server } from "../mocks/server";
import { loadUmdBundle } from "./loadUmdBundle";

interface MockBundle {
  mockExport: string;
}

describe("[loadUmdBundle]", () => {
  it("should load and return a UMD bundle", async () => {
    server.use(
      rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) =>
        res(
          ctx.status(200),
          ctx.text(`
define([], () => ({ mockExport: "Hello World" }))
`)
        )
      )
    );

    const umdBundle = await loadUmdBundle<MockBundle>({
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {},
      bundleCacheTtlInMs: 0,
    });

    expect(umdBundle).toEqual({
      mockExport: "Hello World",
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
      rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) =>
        res(ctx.status(status))
      )
    );

    await expect(
      loadUmdBundle<MockBundle>({
        bundleUrl: "https://mock.hostname/api/mockBundle.js",
        dependenciesMap: {},
        bundleCacheTtlInMs: 0,
      })
    ).rejects.toEqual(
      new Error(
        `Failed to fetch umd bundle at URL https://mock.hostname/api/mockBundle.js with status ${status}`
      )
    );
  });

  describe.each`
    invalidReason            | bundleCode                                           | expectedError
    ${"doesn't call define"} | ${"const bob = 'Nothing to see here'"}               | ${"Couldn't load umd bundle"}
    ${"throws in define"}    | ${'define([], () => { throw new Error("FAILED") })'} | ${"FAILED"}
  `(
    "when the bundle source $invalidReason",
    ({ bundleCode, expectedError }) => {
      it(`should throw an error saying ${expectedError}`, async () => {
        server.use(
          rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) =>
            res(ctx.status(200), ctx.text(bundleCode))
          )
        );

        await expect(
          loadUmdBundle<MockBundle>({
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
            bundleCacheTtlInMs: 0,
          })
        ).rejects.toEqual(new Error(expectedError));
      });
    }
  );
});
