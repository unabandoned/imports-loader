"use strict";

// The three ways CyberChef's webpack.config.js applies this loader, compiled
// for real against the fixtures.
const assert = require("node:assert/strict");
const { test } = require("node:test");

const { compile, getCompiler, getErrors, getModuleSource } = require("./helpers");

const cases = [
  {
    name: "node-forge: additionalCode",
    options: { additionalCode: "var jQuery = false;" },
    expected: "/*** IMPORTS FROM imports-loader ***/\n\nvar jQuery = false;\n\n",
  },
  {
    name: "bootstrap-material-design: a default ES import",
    options: { imports: "default lib_1 Popper" },
    expected: '/*** IMPORTS FROM imports-loader ***/\nimport Popper from "lib_1";\n\n',
  },
  {
    name: "blueimp-load-image: a CommonJS single import",
    options: { type: "commonjs", imports: "single lib_1 document" },
    expected: '/*** IMPORTS FROM imports-loader ***/\nvar document = require("lib_1");\n\n',
  },
];

for (const { name, options, expected } of cases) {
  test(name, async () => {
    const stats = await compile(getCompiler("some-library.js", options));

    assert.deepEqual(getErrors(stats), []);
    assert.ok(
      getModuleSource("./some-library.js", stats).startsWith(expected),
      getModuleSource("./some-library.js", stats),
    );
  });
}
