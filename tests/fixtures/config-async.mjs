// Async function export
export default async function() {
  // Simulate async operation
  await Promise.resolve();
  
  return {
    appName: "test-app-async",
    version: "3.0.0",
    async: true
  };
}
