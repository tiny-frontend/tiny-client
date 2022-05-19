import {
  DefaultRequestBody,
  ResponseComposition,
  rest,
  RestContext,
} from "msw";

import { server } from "../mocks/server";
import {
  loadUmdBundleServerWithCache,
  umdBundlesPromiseCacheMap,
} from "./loadUmdBundle";

interface MockBundle {
  mockExport: string;
}

describe("[loadUmdBundle]", () => {
  afterEach(() => umdBundlesPromiseCacheMap.clear());

  it("should load and return a UMD bundle", async () => {
    server.use(
      rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) =>
        res(
          ctx.status(200),
          ctx.text('define([], () => ({ mockExport: "Hello World" }))')
        )
      )
    );

    const umdBundle = await loadUmdBundleServerWithCache<MockBundle>({
      tinyFrontendName: "mockTinyFrontendName",
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {},
      baseCacheKey: "bundle-1.0.0",
    });

    expect(umdBundle).toEqual({ mockExport: "Hello World" });
  });

  it("should provide dependencies to the UMD bundle", async () => {
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

    const umdBundle = await loadUmdBundleServerWithCache<MockBundle>({
      tinyFrontendName: "mockTinyFrontendName",
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {
        myMockDep: "MOCK_DEP",
        myMockDep2: "MOCK_DEP_2",
      },
      baseCacheKey: "bundle-1.0.0",
    });

    expect(umdBundle).toEqual({ mockExport: "MOCK_DEP - MOCK_DEP_2" });
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
      loadUmdBundleServerWithCache<MockBundle>({
        tinyFrontendName: "mockTinyFrontendName",
        bundleUrl: "https://mock.hostname/api/mockBundle.js",
        dependenciesMap: {},
        baseCacheKey: "bundle-1.0.0",
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
          loadUmdBundleServerWithCache<MockBundle>({
            tinyFrontendName: "mockTinyFrontendName",
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
            baseCacheKey: "bundle-1.0.0",
          })
        ).rejects.toEqual(new Error(expectedError));
      });
    }
  );

  describe("when using a retry policy", () => {
    describe.each`
      failureReason                         | failureResponseBuilder
      ${"server returns non 200"}           | ${(res: ResponseComposition<DefaultRequestBody>, ctx: RestContext) => res(ctx.status(400))}
      ${"server returns an invalid module"} | ${(res: ResponseComposition<DefaultRequestBody>, ctx: RestContext) => res(ctx.status(200), ctx.text('define([], () => { throw new Error("FAILED") })'))}
    `("when $failureReason", ({ failureResponseBuilder }) => {
      it("should retry and succeed", async () => {
        let count = 0;
        server.use(
          rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) => {
            if (count === 0) {
              count++;
              return failureResponseBuilder(res, ctx);
            }
            return res(
              ctx.status(200),
              ctx.text('define([], () => ({ mockExport: "Hello World" }))')
            );
          })
        );

        const umdBundle = await loadUmdBundleServerWithCache<MockBundle>({
          tinyFrontendName: "mockTinyFrontendName",
          bundleUrl: "https://mock.hostname/api/mockBundle.js",
          dependenciesMap: {},
          retryPolicy: {
            maxRetries: 1,
            delayInMs: 10,
          },
          baseCacheKey: "bundle-1.0.0",
        });

        expect(umdBundle).toEqual({ mockExport: "Hello World" });
      });
    });
  });

  describe("when using cache", () => {
    const mockLoadUmdBundleServerWithCacheOptions = {
      tinyFrontendName: "mockTinyFrontendName",
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {},
      baseCacheKey: "bundle-1.0.0",
    };

    describe("when loading the bundle succeeds", () => {
      let apiCallsCount: number;
      beforeEach(() => {
        apiCallsCount = 0;

        server.use(
          rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) => {
            apiCallsCount++;
            return res(
              ctx.status(200),
              ctx.text('define([], () => ({ mockExport: "Hello World" }))')
            );
          })
        );
      });

      describe("when called in parallel", () => {
        it("should reuse results", async () => {
          const [umdBundle1, umdBundle2] = await Promise.all([
            loadUmdBundleServerWithCache<MockBundle>(
              mockLoadUmdBundleServerWithCacheOptions
            ),
            loadUmdBundleServerWithCache<MockBundle>(
              mockLoadUmdBundleServerWithCacheOptions
            ),
          ]);

          expect(umdBundle1).toEqual({ mockExport: "Hello World" });
          expect(umdBundle2).toEqual({ mockExport: "Hello World" });
          expect(umdBundle1).toBe(umdBundle2);
          expect(apiCallsCount).toEqual(1);
        });
      });

      describe("when called in sequence", () => {
        it("should reuse results", async () => {
          const umdBundle1 = await loadUmdBundleServerWithCache<MockBundle>(
            mockLoadUmdBundleServerWithCacheOptions
          );
          expect(umdBundle1).toEqual({ mockExport: "Hello World" });

          const umdBundle2 = await loadUmdBundleServerWithCache<MockBundle>(
            mockLoadUmdBundleServerWithCacheOptions
          );
          expect(umdBundle2).toEqual({ mockExport: "Hello World" });

          expect(umdBundle1).toBe(umdBundle2);

          expect(apiCallsCount).toEqual(1);
        });
      });

      /*
      This behaviour avoids memory leaks if the host is a long-running process.
      This avoids having more than one bundle in memory for any given contract version.
       */
      describe("when bundleUrl changes for a given baseCacheKey", () => {
        it("should bust the cache for the initial bundleUrl", async () => {
          server.use(
            rest.get(
              "https://mock.hostname/api/mockBundle2.js",
              (_, res, ctx) =>
                res(
                  ctx.status(200),
                  ctx.text(
                    'define([], () => ({ mockExport: "This is bundle2" }))'
                  )
                )
            )
          );

          const umdBundle1 = await loadUmdBundleServerWithCache<MockBundle>(
            mockLoadUmdBundleServerWithCacheOptions
          );
          expect(umdBundle1).toEqual({ mockExport: "Hello World" });

          const umdBundle2 = await loadUmdBundleServerWithCache<MockBundle>({
            ...mockLoadUmdBundleServerWithCacheOptions,
            bundleUrl: "https://mock.hostname/api/mockBundle2.js",
          });
          expect(umdBundle2).toEqual({ mockExport: "This is bundle2" });

          expect(apiCallsCount).toEqual(1);

          const umdBundle1SecondTime =
            await loadUmdBundleServerWithCache<MockBundle>(
              mockLoadUmdBundleServerWithCacheOptions
            );
          expect(umdBundle1SecondTime).toEqual({ mockExport: "Hello World" });

          expect(umdBundle1).not.toBe(umdBundle1SecondTime);
          expect(apiCallsCount).toEqual(2);
        });
      });
    });

    describe("when loading the bundle fails", () => {
      describe("when called in parallel", () => {
        it("should call the server only once and fail for all", async () => {
          let apiCallsCount = 0;

          server.use(
            rest.get(
              "https://mock.hostname/api/mockBundle.js",
              (_, res, ctx) => {
                apiCallsCount++;
                return res(ctx.status(400));
              }
            )
          );

          const promise1 = loadUmdBundleServerWithCache<MockBundle>(
            mockLoadUmdBundleServerWithCacheOptions
          );
          const promise2 = loadUmdBundleServerWithCache<MockBundle>(
            mockLoadUmdBundleServerWithCacheOptions
          );

          await expect(promise1).rejects.toBeDefined();
          await expect(promise2).rejects.toBeDefined();

          expect(apiCallsCount).toEqual(1);
        });
      });

      describe("when called in sequence", () => {
        it("should not cache results and call the server again the second time", async () => {
          let apiCallsCount = 0;

          server.use(
            rest.get(
              "https://mock.hostname/api/mockBundle.js",
              (_, res, ctx) => {
                apiCallsCount++;
                return res(ctx.status(400));
              }
            )
          );

          await expect(
            loadUmdBundleServerWithCache<MockBundle>(
              mockLoadUmdBundleServerWithCacheOptions
            )
          ).rejects.toBeDefined();
          await expect(
            loadUmdBundleServerWithCache<MockBundle>(
              mockLoadUmdBundleServerWithCacheOptions
            )
          ).rejects.toBeDefined();

          expect(apiCallsCount).toEqual(2);
        });
      });
    });
  });
});
