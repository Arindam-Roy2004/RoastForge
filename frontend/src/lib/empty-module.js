// Browser stub for Node's built-in `module`. MuPDF's WASM glue references
// `await import("module")` only on a Node-guarded code path, so this is never
// actually invoked in the browser — it exists solely to satisfy the bundler.
export function createRequire() {
  return () => {
    throw new Error("createRequire is not available in the browser");
  };
}

export default { createRequire };
