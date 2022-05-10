module.exports = {
  setupFilesAfterEnv: ["./jest.setup.ts"],
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts)?$": "ts-jest",
  },
};
