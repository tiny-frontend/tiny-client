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

  it("should provide dependencies", async () => {
    server.use(
      rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) =>
        res(
          ctx.status(200),
          ctx.text(`
define(['myMockDep', 'myMockDep2'], (myMockDep, myMockDep2) => ({ mockExport: \`\${myMockDep} - \${myMockDep2}\` }))
`)
        )
      )
    );

    const umdBundle = await loadUmdBundle<MockBundle>({
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {
        myMockDep: "MOCK_DEP",
        myMockDep2: "MOCK_DEP_2",
      },
      bundleCacheTtlInMs: 0,
    });

    expect(umdBundle).toEqual({
      mockExport: "MOCK_DEP - MOCK_DEP_2",
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

  it("should retry fetching when passed a retry policy", async () => {
    let count = 0;
    server.use(
      rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) => {
        if (count === 0) {
          count++;
          return res(ctx.status(400));
        }
        return res(
          ctx.status(200),
          ctx.text(`
define([], () => ({ mockExport: "Hello World" }))
`)
        );
      })
    );

    const umdBundle = await loadUmdBundle<MockBundle>({
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {},
      bundleCacheTtlInMs: 0,
      retryPolicy: {
        maxRetries: 1,
        delay: 10,
      },
    });

    expect(umdBundle).toEqual({
      mockExport: "Hello World",
    });
  });
});
