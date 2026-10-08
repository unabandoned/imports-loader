"use strict";

// Stands in for a previous loader (upstream used babel-loader): passes the
// source through unchanged with a line-for-line source map, so the test can
// check that imports-loader chains onto an incoming map.
const { SourceMapGenerator } = require("source-map-js");

module.exports = function identityMapLoader(content) {
  const generator = new SourceMapGenerator({ file: this.resourcePath });

  generator.setSourceContent(this.resourcePath, content);
  content.split("\n").forEach((_, index) => {
    generator.addMapping({
      generated: { line: index + 1, column: 0 },
      original: { line: index + 1, column: 0 },
      source: this.resourcePath,
    });
  });

  this.callback(null, content, generator.toJSON());
};
