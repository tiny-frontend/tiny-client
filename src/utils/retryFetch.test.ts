import { retryFetch } from "./retryFetch";

describe("[retryFetch]", () => {
  describe("when there are retries configured", () => {
    it("should exaust retries", async () => {
      const maxRetries = 3;
      const loader = jest.fn(() => Promise.reject("error"));

      try {
        retryFetch({ loader, options: { delay: 100, maxRetries } });
      } catch (err) {
        expect(loader).toBeCalledTimes(maxRetries);
      }
    });

    it("throws an error after exausting the retries", async () => {
      const maxRetries = 3;
      const errorMessage = "Oh no, there was an error!";
      const loader = jest.fn(() => Promise.reject(errorMessage));

      retryFetch({ loader, options: { delay: 100, maxRetries } });

      expect(loader).rejects.toThrow(errorMessage);
    });
  });
});
