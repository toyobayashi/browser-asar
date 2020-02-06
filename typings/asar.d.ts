declare class Stat {
  constructor(info: any);
  readonly size: number;
  isUnpacked(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

declare class Module {
  constructor(id: string, parent: Module | null);
  id: string;
  filename: string;
  path: string;
  parent: Module | null;
  loaded: boolean;
  exports: any;
  children: Module[];
  paths: string[];
  require(mod: string): any;
}

export declare class Filesystem {
  constructor(buffer: Uint8Array);
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

export declare class Modulesystem {
  constructor(fs: Filesystem | Uint8Array);
  static run(fs: Filesystem, entry?: string): any;
  static inject(moduleName: string, m: any): void;
  static require(moduleName: string): any;
  static extend(ext: string, compilerFactory: (require: (moduleName: string) => any) => (module: Module, filename: string) => void): void;
  run(entry?: string): any;
  inject(moduleName: string, m: any): void;
  require(moduleName: string): any;
  extend(ext: string, compilerFactory: (this: Modulesystem, require: (this: Modulesystem, moduleName: string) => any) => (module: Module, filename: string) => void): void;
}

export as namespace asar;
