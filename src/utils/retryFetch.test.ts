import * as retry from "./retryFetch";

const { retryFetch } = retry;

describe("[retryFetch]", () => {
  afterEach(() => jest.clearAllMocks());

  describe("when there are retries configured", () => {
    it("should return if no error occurred", async () => {
      const maxRetries = 3;
      const result = () => "result";

      const loader = jest.fn(() => Promise.resolve(result));

      await expect(
        retryFetch({ loader, retryPolicy: { delay: 100, maxRetries } })
      ).resolves.toBe(result);
    });
    it("should exhaust retries and throw an error after exhausting them", async () => {
      const maxRetries = 3;
      const error = new Error("Oh no, there was an error!");

      const loader = jest.fn(() => Promise.reject(error));

      await expect(
        retryFetch({ loader, retryPolicy: { delay: 100, maxRetries } })
      ).rejects.toBe(error);

      expect(loader).toBeCalledTimes(4);
    });
    it("should increase the delay as retries fail", async () => {
      const maxRetries = 4;
      const error = new Error("Oh no, there was an error!");

      const loader = jest.fn(() => Promise.reject(error));
      const spy = jest.spyOn(retry, "retryFetch");

      await expect(
        retryFetch({ loader, retryPolicy: { delay: 10, maxRetries } })
      ).rejects.toBe(error);

      expect(spy).toBeCalledWith(
        expect.objectContaining({
          loader,
          options: { delay: 20, maxRetries: 3 },
        })
      );
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          loader,
          options: { delay: 40, maxRetries: 2 },
        })
      );
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          loader,
          options: { delay: 80, maxRetries: 1 },
        })
      );
    });
  });

  describe("when retries are 0", () => {
    it("should not retry", async () => {
      const loader = jest.fn(() =>
        Promise.reject(new Error("Something went wrong"))
      );
      const spy = jest.spyOn(retry, "retryFetch");

      await expect(
        retryFetch({ loader, retryPolicy: { delay: 10, maxRetries: 0 } })
      ).rejects.toBeDefined();

      expect(spy).toBeCalledTimes(0);
    });
  });
});
