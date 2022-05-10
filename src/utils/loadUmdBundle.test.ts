import {
  DefaultRequestBody,
  ResponseComposition,
  rest,
  RestContext,
} from "msw";

import { server } from "../mocks/server";
import { loadUmdBundle, umdBundlesPromiseCacheMap } from "./loadUmdBundle";

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

    const umdBundle = await loadUmdBundle<MockBundle>({
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {},
    });

    expect(umdBundle).toEqual({
      mockExport: "Hello World",
    });
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

    const umdBundle = await loadUmdBundle<MockBundle>({
      bundleUrl: "https://mock.hostname/api/mockBundle.js",
      dependenciesMap: {
        myMockDep: "MOCK_DEP",
        myMockDep2: "MOCK_DEP_2",
      },
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

        const umdBundle = await loadUmdBundle<MockBundle>({
          bundleUrl: "https://mock.hostname/api/mockBundle.js",
          dependenciesMap: {},
          retryPolicy: {
            maxRetries: 1,
            delayInMs: 10,
          },
        });

        expect(umdBundle).toEqual({
          mockExport: "Hello World",
        });
      });
    });
  });

  describe("when using cache", () => {
    describe("when loading the bundle succeeds", () => {
      let timesServerIsCalled: number;
      beforeEach(() => {
        timesServerIsCalled = 0;

        server.use(
          rest.get("https://mock.hostname/api/mockBundle.js", (_, res, ctx) => {
            timesServerIsCalled++;
            return res(
              ctx.status(200),
              ctx.text('define([], () => ({ mockExport: "Hello World" }))')
            );
          })
        );
      });

      describe("when called in parallel", () => {
        it("should reuse results", async () => {
          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };
          const [umdBundle1, umdBundle2] = await Promise.all([
            loadUmdBundle<MockBundle>(loadUmdBundleOptions),
            loadUmdBundle<MockBundle>(loadUmdBundleOptions),
          ]);

          expect(umdBundle1).toEqual({
            mockExport: "Hello World",
          });
          expect(umdBundle2).toEqual({
            mockExport: "Hello World",
          });
          expect(umdBundle1).toBe(umdBundle2);
          expect(timesServerIsCalled).toEqual(1);
        });
      });

      describe("when called in sequence", () => {
        it("should reuse results", async () => {
          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };
          const umdBundle1 = await loadUmdBundle<MockBundle>(
            loadUmdBundleOptions
          );
          expect(umdBundle1).toEqual({
            mockExport: "Hello World",
          });

          const umdBundle2 = await loadUmdBundle<MockBundle>(
            loadUmdBundleOptions
          );
          expect(umdBundle2).toEqual({
            mockExport: "Hello World",
          });

          expect(umdBundle1).toBe(umdBundle2);

          expect(timesServerIsCalled).toEqual(1);
        });
      });

      describe("when it has a ttl on the second call", () => {
        it("should expire after ttl has passed", async () => {
          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };
          const umdBundle1 = await loadUmdBundle<MockBundle>(
            loadUmdBundleOptions
          );
          expect(umdBundle1).toEqual({
            mockExport: "Hello World",
          });

          await new Promise((resolve) => setTimeout(resolve, 20));

          const umdBundle2 = await loadUmdBundle<MockBundle>({
            ...loadUmdBundleOptions,
            bundleCacheTtlInMs: 10,
          });
          expect(umdBundle2).toEqual({
            mockExport: "Hello World",
          });

          expect(umdBundle1).not.toBe(umdBundle2);

          expect(timesServerIsCalled).toEqual(2);
        });
      });

      describe("when ttl is 0 on the second call", () => {
        it("should not use cache at all", async () => {
          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };
          const [umdBundle1, umdBundle2] = await Promise.all([
            loadUmdBundle<MockBundle>(loadUmdBundleOptions),
            loadUmdBundle<MockBundle>({
              ...loadUmdBundleOptions,
              bundleCacheTtlInMs: 0,
            }),
          ]);

          expect(umdBundle1).toEqual({
            mockExport: "Hello World",
          });
          expect(umdBundle2).toEqual({
            mockExport: "Hello World",
          });
          expect(umdBundle1).not.toBe(umdBundle2);
          expect(timesServerIsCalled).toEqual(2);
        });
      });
    });

    describe("when loading the bundle fails", () => {
      describe("when called in parallel", () => {
        it("should call the server only once and fail for all", async () => {
          let timesServerIsCalled = 0;

          server.use(
            rest.get(
              "https://mock.hostname/api/mockBundle.js",
              (_, res, ctx) => {
                timesServerIsCalled++;
                return res(ctx.status(400));
              }
            )
          );

          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };

          const promise1 = loadUmdBundle<MockBundle>(loadUmdBundleOptions);
          const promise2 = loadUmdBundle<MockBundle>(loadUmdBundleOptions);

          await expect(promise1).rejects.toBeDefined();
          await expect(promise2).rejects.toBeDefined();

          expect(timesServerIsCalled).toEqual(1);
        });
      });

      describe("when called in sequence", () => {
        it("should not cache results and call the server again the second time", async () => {
          let timesServerIsCalled = 0;

          server.use(
            rest.get(
              "https://mock.hostname/api/mockBundle.js",
              (_, res, ctx) => {
                timesServerIsCalled++;
                return res(ctx.status(400));
              }
            )
          );

          const loadUmdBundleOptions = {
            bundleUrl: "https://mock.hostname/api/mockBundle.js",
            dependenciesMap: {},
          };
          await expect(
            loadUmdBundle<MockBundle>(loadUmdBundleOptions)
          ).rejects.toBeDefined();
          await expect(
            loadUmdBundle<MockBundle>(loadUmdBundleOptions)
          ).rejects.toBeDefined();

          expect(timesServerIsCalled).toEqual(2);
        });
      });
    });
  });
});
