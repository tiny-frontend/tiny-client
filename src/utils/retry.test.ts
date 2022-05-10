import * as retryModule from "./retry";

const { retry } = retryModule;

describe("[retry]", () => {
  afterEach(() => jest.clearAllMocks());

  describe("when there are retries configured", () => {
    it("should return if no error occurred", async () => {
      const maxRetries = 3;
      const result = () => "result";

      const fnToRetry = jest.fn(() => Promise.resolve(result));

      await expect(
        retry(fnToRetry, { delayInMs: 10, maxRetries })
      ).resolves.toBe(result);
    });
    it("should exhaust retries and throw an error after exhausting them", async () => {
      const maxRetries = 3;
      const error = new Error("Oh no, there was an error!");

      const fnToRetry = jest.fn(() => Promise.reject(error));

      await expect(
        retry(fnToRetry, { delayInMs: 10, maxRetries })
      ).rejects.toBe(error);

      expect(fnToRetry).toBeCalledTimes(4);
    });
    it("should increase the delay as retries fail", async () => {
      const maxRetries = 4;
      const error = new Error("Oh no, there was an error!");

      const fnToRetry = jest.fn(() => Promise.reject(error));
      const spy = jest.spyOn(retryModule, "retry");

      await expect(
        retry(fnToRetry, { delayInMs: 10, maxRetries })
      ).rejects.toBe(error);

      expect(spy).toBeCalledWith(fnToRetry, { delayInMs: 20, maxRetries: 3 });
      expect(spy).toBeCalledWith(fnToRetry, { delayInMs: 40, maxRetries: 2 });
      expect(spy).toBeCalledWith(fnToRetry, { delayInMs: 80, maxRetries: 1 });
    });
  });

  describe("when retries are 0", () => {
    it("should not retry", async () => {
      const fnToRetry = jest.fn(() =>
        Promise.reject(new Error("Something went wrong"))
      );
      const spy = jest.spyOn(retryModule, "retry");

      await expect(
        retry(fnToRetry, { delayInMs: 10, maxRetries: 0 })
      ).rejects.toBeDefined();

      expect(spy).toBeCalledTimes(0);
    });
  });
});
