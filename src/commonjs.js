import { validateString } from './constants.js';
import * as path from './path.js';
import Filesystem from './filesystem.js';
import { createModuleClass, requireModule, inject, extend } from './module.js';

export { requireModule, inject, extend };

/**
 * Run an asar package like a Node.js project.
 * @param {Filesystem} fs - Filesystem object
 * @returns {any} module.exports of entry module
 */
export function run (fs) {
  if (!(fs instanceof Filesystem)) {
    throw new TypeError('The argument \'fs\' must be a Filesystem object.');
  }
  var mainModule;
  var makeRequireFunction = function makeRequireFunction (mod) {
    var Module = mod.constructor;
    var require = function require (path) {
      return mod.require(path);
    };

    function resolve (request) {
      validateString(request, 'request');
      return Module._resolveFilename(request, mod, false);
    }

    require.resolve = resolve;

    function paths (request) {
      validateString(request, 'request');
      return Module._resolveLookupPaths(request, mod);
    }

    resolve.paths = paths;
    require.main = mainModule;
    require.extensions = Module._extensions;
    require.cache = Module._cache;

    return require;
  };

  var Module = createModuleClass(fs, makeRequireFunction);
  var entry = Module._resolveFilename('/', null, true);
  var module = Module._cache[entry] = new Module(entry, null);
  module.filename = entry;
  module.paths = Module._nodeModulePaths(path.dirname(entry));
  mainModule = module;
  try {
    Module._extensions[path.extname(entry)](module, entry);
  } catch (err) {
    delete Module._cache[entry];
    mainModule = undefined;
    throw err;
  }
  module.loaded = true;

  return module.exports;
}
