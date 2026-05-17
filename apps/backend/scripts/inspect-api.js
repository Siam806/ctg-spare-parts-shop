const path = require("path");
const util = require("util");
function tryRequire(p) {
  try {
    return require(p);
  } catch (e) {
    return null;
  }
}
let RoutesLoader = null;
let MiddlewareFileLoader = null;
try {
  const frameworkRoot = require.resolve("@medusajs/framework");
  const rootDir = path.dirname(frameworkRoot);
  const routesLoaderPath = path.join(rootDir, "http", "routes-loader.js");
  const middlewareLoaderPath = path.join(rootDir, "http", "middleware-file-loader.js");
  console.log('Attempting to require:', routesLoaderPath);
  const RoutesLoaderModule = tryRequire(routesLoaderPath);
  const MiddlewareLoaderModule = tryRequire(middlewareLoaderPath);
  console.log('RoutesLoaderModule keys:', Object.keys(RoutesLoaderModule || {}));
  console.log('MiddlewareLoaderModule keys:', Object.keys(MiddlewareLoaderModule || {}));
  RoutesLoader = RoutesLoaderModule && (RoutesLoaderModule.RoutesLoader || RoutesLoaderModule.default || RoutesLoaderModule);
  MiddlewareFileLoader = MiddlewareLoaderModule && (MiddlewareLoaderModule.MiddlewareFileLoader || MiddlewareLoaderModule.default || MiddlewareLoaderModule);
} catch (e) {
  console.error('Failed to resolve framework loaders:', e && e.stack ? e.stack : e);
}
console.log('Resolved RoutesLoader:', typeof RoutesLoader);
console.log('Resolved MiddlewareFileLoader:', typeof MiddlewareFileLoader);
const srcApi = path.join(__dirname, "..", "src", "api");
(async () => {
  try {
    const routesLoader = new RoutesLoader();
    await routesLoader.scanDir(srcApi);
    const routes = routesLoader.getRoutes();
    console.log("Loaded route handlers:");
    routes.forEach(r => {
      console.log(`${r.method} ${r.matcher} -> handler type: ${typeof r.handler}`);
    });

    if (MiddlewareFileLoader) {
      const mwLoader = new MiddlewareFileLoader();
      await mwLoader.scanDir(srcApi);
      const mws = mwLoader.getMiddlewares();
      console.log("\nLoaded middlewares:");
      mws.forEach((m, idx) => {
        console.log(`${idx}: matcher=${m.matcher} methods=${m.methods} handlerType=${typeof m.handler} policies=${!!m.policies}`);
      });
    } else {
      console.log("MiddlewareFileLoader not found");
    }
  } catch (e) {
    console.error("Error during inspect:", e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
