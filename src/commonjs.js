import { validateString, validateFunction } from './constants.js';
import * as path from './path.js';
import Filesystem from './filesystem.js';
import { builtinModules, extensions, createModuleClass } from './module.js';

/**
 * Inject builtin module that can be required in asar package.
 * @param {string} moduleName - module name
 * @param {any} m - function or any value
 */
export function inject (moduleName, m) {
  validateString(moduleName, 'moduleName');
  if (typeof m === 'function') {
    var module = { exports: {} };
    m.call(module.exports, module.exports, function require (m) {
      validateString(m, 'm');
      if (m in builtinModules) {
        return builtinModules[m];
      }
      throw new Error('Cannot find module \'' + m + '\'. ');
    }, module);
    builtinModules[moduleName] = module.exports;
  } else {
    builtinModules[moduleName] = m;
  }
}

/**
 * Handle custom file format.
 * @param {string} ext - extension
 * @param {(fs: Filesystem) => (module: InstanceType<ReturnType<createModuleClass>>, filename: string) => void} compilerFactory - how to load file
 */
export function extend (ext, compilerFactory) {
  validateString(ext, 'ext');
  validateFunction(compilerFactory, 'compilerFactory');
  extensions[ext] = compilerFactory;
}

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
