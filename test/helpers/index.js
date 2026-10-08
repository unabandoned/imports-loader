"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const webpack = require("webpack");

const fixtures = path.resolve(__dirname, "../fixtures");
const loaderPath = path.resolve(__dirname, "../../src");

function getCompiler(fixture, loaderOptions = {}, config = {}, disableLoader = false) {
  const loaders = [];

  if (!disableLoader) {
    loaders.push({
      test: path.resolve(fixtures, fixture),
      use: [{ loader: loaderPath, options: loaderOptions || {} }],
    });
  }

  return webpack({
    mode: "development",
    devtool: config.devtool || false,
    context: fixtures,
    entry: path.resolve(fixtures, fixture),
    output: {
      path: fs.mkdtempSync(path.join(os.tmpdir(), "imports-loader-")),
      filename: "[name].bundle.js",
      chunkFilename: "[name].chunk.js",
      library: "ImportsLoader",
    },
    module: { rules: loaders },
    plugins: [],
    resolve: {
      alias: {
        lib_1: path.resolve(fixtures, "lib_1"),
        lib_2: path.resolve(fixtures, "lib_2"),
        lib_3: path.resolve(fixtures, "lib_3"),
        lib_4: path.resolve(fixtures, "lib_4"),
      },
    },
    ...config,
  });
}

function compile(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      compiler.close(() => resolve(stats));
    });
  });
}

function removeCWD(str) {
  let cwd = process.cwd();

  if (process.platform === "win32") {
    str = str.replaceAll("\\", "/");
    cwd = cwd.replaceAll("\\", "/");
  }

  return str
    .replace(/\(from .*?\)/, "(from `replaced original path`)")
    .replaceAll(cwd, "");
}

function normalizeErrors(errors) {
  return errors.map((error) =>
    removeCWD(error.toString().split("\n").slice(0, 2).join("\n")),
  );
}

const getErrors = (stats) => normalizeErrors(stats.compilation.errors);
const getWarnings = (stats) => normalizeErrors(stats.compilation.warnings);

function getModuleSource(name, stats) {
  const { modules } = stats.toJson({ source: true });

  return modules.find((m) => m.name.includes(name)).source;
}

function readAsset(asset, compiler, stats) {
  const target = asset.split("?")[0];

  try {
    return compiler.outputFileSystem
      .readFileSync(path.join(stats.compilation.outputOptions.path, target))
      .toString();
  } catch (error) {
    return error.toString();
  }
}

module.exports = {
  compile,
  getCompiler,
  getErrors,
  getModuleSource,
  getWarnings,
  normalizeErrors,
  readAsset,
};
