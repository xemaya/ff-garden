import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetLoader, loadCharacterAssets} from '../src/asset-loading.js';

test('concurrent callers share one load and reuse a successful asset', async () => {
  let calls = 0;
  const asset = {};
  const load = createAssetLoader(async () => { calls++; return asset; });
  const first = load(), second = load();
  assert.equal(first, second);
  assert.equal(await first, asset);
  assert.equal(await load(), asset);
  assert.equal(calls, 1);
});

test('a failed asset can be retried, including a synchronous validation error', async () => {
  for (const synchronous of [false, true]) {
    let calls = 0;
    const load = createAssetLoader(() => {
      if (++calls === 1) {
        const error = new Error('missing required animation');
        if (synchronous) throw error;
        return Promise.reject(error);
      }
      return 'valid asset';
    });
    await assert.rejects(load(), /missing required animation/);
    const retry = load();
    assert.equal(retry, load());
    assert.equal(await retry, 'valid asset');
    assert.equal(calls, 2);
  }
});

test('characters start concurrently and one failure preserves the other results', async () => {
  const started = [], finish = {};
  const loaders = Object.fromEntries(['moogle', 'mage', 'chocobo'].map(name => [name,
    () => { started.push(name); return new Promise((resolve, reject) => { finish[name] = {resolve, reject}; }); }
  ]));
  const loading = loadCharacterAssets(loaders);
  await Promise.resolve();
  assert.deepEqual(started, ['moogle', 'mage', 'chocobo']);
  // Resolve out of order: results must remain associated with the correct role.
  finish.chocobo.resolve('bird');
  finish.moogle.reject(new Error('network failure'));
  finish.mage.resolve('mage');
  const result = await loading;
  assert.equal(result.moogle.status, 'rejected');
  assert.equal(result.mage.value, 'mage');
  assert.equal(result.chocobo.value, 'bird');
});

test('synchronous failure and complete failure never reject the optional batch', async () => {
  const result = await loadCharacterAssets({
    moogle: () => { throw new Error('invalid asset'); },
    mage: () => Promise.reject(new Error('404')),
    chocobo: () => Promise.reject(new Error('offline')),
  });
  assert.ok(Object.values(result).every(asset => asset.status === 'rejected'));
  assert.deepEqual(await loadCharacterAssets({}), {});
});

test('each result is reported before the slowest character completes', async () => {
  let releaseSlow;
  const slow = new Promise(resolve => { releaseSlow = resolve; });
  let reportFirst;
  const reports = [], firstReport = new Promise(resolve => { reportFirst = resolve; });
  const loading = loadCharacterAssets({
    moogle: () => 'ready',
    mage: () => slow,
    chocobo: () => Promise.reject(new Error('404')),
  }, (name, result) => { reports.push({name, status: result.status}); reportFirst(); });
  await firstReport;
  assert.equal(reports[0].name, 'moogle');
  assert.equal(reports[0].status, 'fulfilled');
  assert.ok(!reports.some(report => report.name === 'mage'));
  releaseSlow('late asset');
  const result = await loading;
  assert.equal(result.mage.value, 'late asset');
  assert.equal(reports.length, 3);
  assert.equal(reports.find(report => report.name === 'chocobo').status, 'rejected');
});

test('retrying the failed subset does not fetch successful characters again', async () => {
  const calls = {moogle: 0, mage: 0, chocobo: 0};
  const loaders = Object.fromEntries(Object.keys(calls).map(name => [name, createAssetLoader(() => {
    calls[name]++;
    if (name === 'moogle' && calls[name] === 1) throw new Error('temporary failure');
    return name;
  })]));
  const first = await loadCharacterAssets(loaders);
  const failed = Object.keys(first).filter(name => first[name].status === 'rejected');
  const retry = await loadCharacterAssets(Object.fromEntries(failed.map(name => [name, loaders[name]])));
  assert.equal(retry.moogle.value, 'moogle');
  assert.deepEqual(calls, {moogle: 2, mage: 1, chocobo: 1});
});

test('each real character loader retries network and clip-validation failures', async () => {
  const THREE = await import('three');
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
  const original = GLTFLoader.prototype.parseAsync,originalFetch=globalThis.fetch;
  const roles = [
    ['moogle', ['Idle', 'Walk', 'Wave', 'Deliver']],
    ['mage', ['Idle', 'Walk', 'Greet', 'Magic']],
    ['chocobo', ['Idle', 'Walk', 'Chirp', 'Flap']],
  ];
  try {
    for (const [name, clips] of roles) {
      let calls = 0;
      const valid = {scene: new THREE.Group(), animations: clips.map(clip => new THREE.AnimationClip(clip, 1, []))};
      globalThis.fetch = async () => {
        calls++;
        if (calls === 1) throw new Error('network unavailable');
        return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};
      };
      GLTFLoader.prototype.parseAsync = async () => {
        if (calls === 2) return {...valid, animations: []};
        return valid;
      };
      const module = await import('../src/' + name + '.js');
      const title = name[0].toUpperCase() + name.slice(1);
      const load = module['load' + title + 'Asset'];
      await assert.rejects(load(), /network unavailable/);
      await assert.rejects(load(), /动作缺失/);
      assert.equal(await load(), valid);
      const animated = {people: []};
      const actor = module['create' + title]({x: 1, z: -20, personIndex: 0}, animated);
      assert.equal(animated.people[0], actor);
      assert.equal(actor.userData[name].snapshot().clip, 'Idle');
      assert.equal(await load(), valid);
      assert.equal(calls, 3);
    }
  } finally {
    GLTFLoader.prototype.parseAsync = original;globalThis.fetch=originalFetch;
  }
});
