// Cache a successful asset and share in-flight work; a failure must be retryable.
export function createAssetLoader(load) {
  let pending = null;
  return function loadAsset() {
    if (!pending) {
      pending = Promise.resolve().then(load).catch(error => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}

// Optional characters must not turn a working street into a loading error.
export async function loadCharacterAssets(loaders, onSettled = () => {}) {
  const entries = Object.entries(loaders);
  const results = await Promise.allSettled(entries.map(([name, load]) => Promise.resolve().then(load).then(
    value => { onSettled(name, {status: 'fulfilled', value}); return value; },
    reason => { onSettled(name, {status: 'rejected', reason}); throw reason; },
  )));
  return Object.fromEntries(entries.map(([name], index) => [name, results[index]]));
}
