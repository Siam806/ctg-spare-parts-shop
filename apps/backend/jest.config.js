const { loadEnv } = require("@medusajs/utils");
const { URL } = require("url");

loadEnv("test", process.cwd());

function deriveDatabaseEnvFromDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return;
  }

  try {
    const parsed = new URL(dbUrl);
    if (!parsed.hostname) {
      return;
    }

    process.env.DB_HOST ??= parsed.hostname;
    process.env.DB_PORT ??= parsed.port || "5432";
    process.env.DB_USERNAME ??= parsed.username || "postgres";
    process.env.DB_PASSWORD ??= parsed.password || "";

    const sslMode = parsed.searchParams.get("sslmode");
    if (sslMode) {
      process.env.PGSSLMODE ??= sslMode;
    }
    else {
      process.env.PGSSLMODE ??= "require";
    }
  }
  catch (_err) {
    // Ignore invalid DATABASE_URL and fall back to existing DB_* env vars.
  }
}

deriveDatabaseEnvFromDatabaseUrl();

module.exports = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.js"],
};

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"];
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"];
} else if (process.env.TEST_TYPE === "unit") {
  module.exports.testMatch = ["**/src/**/__tests__/**/*.unit.spec.[jt]s"];
}
