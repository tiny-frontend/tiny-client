import * as retry from "./retryFetch";

const { retryFetch } = retry;

describe("[retryFetch]", () => {
  describe("when there are retries configured", () => {
    it("should return if no error occured", async () => {
      const maxRetries = 3;
      const result = () => "result";

      const loader = jest.fn(() => Promise.resolve(result));

      await expect(
        retryFetch({ loader, options: { delay: 100, maxRetries } })
      ).resolves.toBe(result);
    });
    it("should exaust retries and throw an error after exausting them", async () => {
      const maxRetries = 3;
      const error = new Error("Oh no, there was an error!");

      const loader = jest.fn(() => Promise.reject(error));

      await expect(
        retryFetch({ loader, options: { delay: 100, maxRetries } })
      ).rejects.toBe(error);

      expect(loader).toBeCalledTimes(maxRetries);
    });
    it("should increase the delay as retries fail", async () => {
      const maxRetries = 3;
      const error = new Error("Oh no, there was an error!");

      const loader = jest.fn(() => Promise.reject(error));
      const spy = jest.spyOn(retry, "retryFetch");

      await expect(
        retryFetch({ loader, options: { delay: 100, maxRetries } })
      ).rejects.toBe(error);

      expect(spy).toBeCalledWith(
        expect.objectContaining({
          loader,
          options: { delay: 200, maxRetries: 2 }
        })
      );
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          loader,
          options: { delay: 400, maxRetries: 1 }
        })
      );
    });
  });
});
