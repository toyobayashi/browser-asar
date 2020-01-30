declare class Stat {
  constructor (info: any): Stat;
  readonly size: number;
  isUnpacked(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export declare class Filesystem {
  constructor (buffer: Uint8Array): Filesystem;
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

export as namespace asar;
