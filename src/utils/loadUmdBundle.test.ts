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
    });

    expect(umdBundle).toEqual({
      mockExport: "Hello World",
    });
  });
});
