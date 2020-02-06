# browser-asar

Handle [asar](https://github.com/electron/asar) file in browser. (Readonly)

AJAX demo: [https://toyobayashi.github.io/browser-asar/](https://toyobayashi.github.io/browser-asar/)

File input demo: [https://toyobayashi.github.io/browser-asar/file.html](https://toyobayashi.github.io/browser-asar/file.html)

Running demo: [https://toyobayashi.github.io/browser-asar/test.html](https://toyobayashi.github.io/browser-asar/test.html)

Support IE 10+ (require `Uint8Array`)

## Usage

You can find examples in `docs/` and `test/`.

``` html
<!-- Get it from package.json "main" field -->
<script src="asar.js"></script>
```

``` js
var xhr = new XMLHttpRequest();
xhr.onload = function () {
  var buf = new Uint8Array(xhr.response);
  var fs;
  try {
    fs = new asar.Filesystem(buf);
  } catch (err) {
    throw new Error('Invalid asar file: ' + err.message);
  }

  // Then you can do something like Node.js `fs` module.
  // Note the asar package is readonly.
  // Available API list can be found below.

  // fs.readFileSync(...)
  // fs.existsSync(...)
  // fs.statSync(...).isDirectory()
  // ...

  // Run as a Node.js project folder
  asar.commonjs.run(fs);
};
xhr.open('GET', './test.asar', true);
xhr.responseType = 'arraybuffer';
xhr.send();
```

Available builtin modules in asar package:

* `path` - posix part only

* `fs`

* `module`

## API

``` ts
declare class Stat {
  constructor(info: any): Stat;
  readonly size: number;
  isUnpacked(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

declare class Module {
  id: string;
  filename: string;
  path: string;
  parent: Module | null;
  loaded: boolean;
  exports: any;
  children: Module[];
  paths: string[];
  constructor(id: string, parent: Module | null): Module;
  require(mod: string): any;
}

export declare class Filesystem {
  constructor(buffer: Uint8Array): Filesystem;
  readonly buffer: Uint8Array;
  readonly header: { files: { [item: string]: any } };
  readonly headerSize: number;
  listFiles(options?: { isPack?: boolean }): string[];
  readFileSync(p: string): Uint8Array;
  readFileSync(p: string, toUtf8: true): string;
  readdirSync(p: string): string[];
  existsSync(p: string): boolean;
  statSync(p: string): Stat;
  lstatSync(p: string): Stat;
}

export declare namespace commonjs {
  export function run(fs: Filesystem, entry?: string): any;
  export function inject(moduleName: string, m: any): void;
  export function requireModule(moduleName: string): any;
  export function extend(ext: string, compilerFactory: (fs: Filesystem) => (module: Module, filename: string) => void): void;
}

export as namespace asar;
```
