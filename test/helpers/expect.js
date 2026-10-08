"use strict";

// The handful of jest matchers this suite uses, on top of node:assert, so the
// upstream suite and its recorded snapshots carry over to node:test unchanged.
// Snapshots are read from the jest .snap files in ../__snapshots__. A mismatch
// is a failure; run with UPDATE_SNAPSHOTS=1 to rewrite the recorded value
// instead, and review the diff before committing it.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { beforeEach } = require("node:test");

const snapshotCache = new Map();

function snapshotFile(testFile) {
  return path.join(
    path.dirname(testFile),
    "__snapshots__",
    `${path.basename(testFile)}.snap`,
  );
}

const escape = (str) => str.replace(/`|\\|\$\{/g, "\\$&");

function updateSnapshot(testFile, key, value) {
  const file = snapshotFile(testFile);
  const source = fs.readFileSync(file, "utf8");
  const head = `exports[\`${escape(key)}\`] = \``;
  const start = source.indexOf(head);

  assert.notEqual(start, -1, `cannot update a missing snapshot: ${key}`);

  const end = source.indexOf("`;\n", start + head.length);

  fs.writeFileSync(
    file,
    source.slice(0, start + head.length) + escape(value) + source.slice(end),
  );
}

function loadSnapshots(testFile) {
  if (!snapshotCache.has(testFile)) {
    const exports = {};

    vm.runInNewContext(fs.readFileSync(snapshotFile(testFile), "utf8"), {
      exports,
    });
    snapshotCache.set(testFile, exports);
  }

  return snapshotCache.get(testFile);
}

// The subset of pretty-format (jest's serializer) that strings and arrays of
// strings need.
function serialize(value) {
  if (typeof value === "string") {
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[\n${value.map((item) => `  ${serialize(item)},`).join("\n")}\n]`;
  }

  throw new TypeError(`Cannot serialize ${typeof value} for a snapshot`);
}

function createExpect(testFile, suiteName) {
  let current;

  beforeEach((t) => {
    current = { name: `${suiteName} ${t.name}`, counters: new Map() };
  });

  function matchSnapshot(received, hint) {
    const base = hint ? `${current.name}: ${hint}` : current.name;
    const count = (current.counters.get(base) || 0) + 1;

    current.counters.set(base, count);

    const key = `${base} ${count}`;
    const snapshots = loadSnapshots(testFile);

    assert.ok(Object.hasOwn(snapshots, key), `missing snapshot: ${key}`);

    const serialized = serialize(received);
    const actual = serialized.includes("\n") ? `\n${serialized}\n` : serialized;

    if (process.env.UPDATE_SNAPSHOTS && actual !== snapshots[key]) {
      updateSnapshot(testFile, key, actual);
      return;
    }

    assert.equal(actual, snapshots[key], `snapshot mismatch: ${key}`);
  }

  return function expect(received) {
    return {
      toBe: (expected) => assert.equal(received, expected),
      toEqual: (expected) => assert.deepEqual(received, expected),
      toHaveLength: (length) => assert.equal(received.length, length),
      toMatchSnapshot: (hint) => matchSnapshot(received, hint),
      toThrowErrorMatchingSnapshot: (hint) => {
        let message;

        try {
          received();
        } catch (error) {
          ({ message } = error);
        }

        assert.notEqual(message, undefined, "expected the function to throw");
        matchSnapshot(message, hint);
      },
    };
  };
}

module.exports = { createExpect };
