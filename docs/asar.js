(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.asar = {}));
}(this, (function (exports) { 'use strict';

  var CHAR_DOT = 46;
  var CHAR_FORWARD_SLASH = 47;

  function basename (path, ext) {
    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext === path) { return ''; }
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) { end = firstNonSlashEnd; } else if (end === -1) { end = path.length; }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // path component
        matchedSlash = false;
        end = i + 1;
      }
    }

    if (end === -1) { return ''; }
    return path.slice(start, end);
  }

  function dirname (path) {
    if (path.length === 0) { return '.'; }
    var hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) { return hasRoot ? '/' : '.'; }
    if (hasRoot && end === 1) { return '//'; }
    return path.slice(0, end);
  }

  // Resolves . and .. elements in a path with directory names
  function normalizeString (path, allowAboveRoot, separator, isPathSeparator) {
    var res = '';
    var lastSegmentLength = 0;
    var lastSlash = -1;
    var dots = 0;
    var code = 0;
    for (var i = 0; i <= path.length; ++i) {
      if (i < path.length) { code = path.charCodeAt(i); } else if (isPathSeparator(code)) { break; } else { code = CHAR_FORWARD_SLASH; }

      if (isPathSeparator(code)) {
        if (lastSlash === i - 1 || dots === 1) ; else if (dots === 2) {
          if (res.length < 2 || lastSegmentLength !== 2 ||
              res.charCodeAt(res.length - 1) !== CHAR_DOT ||
              res.charCodeAt(res.length - 2) !== CHAR_DOT) {
            if (res.length > 2) {
              var lastSlashIndex = res.lastIndexOf(separator);
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
              }
              lastSlash = i;
              dots = 0;
              continue;
            } else if (res.length !== 0) {
              res = '';
              lastSegmentLength = 0;
              lastSlash = i;
              dots = 0;
              continue;
            }
          }
          if (allowAboveRoot) {
            res += res.length > 0 ? (separator + '..') : '..';
            lastSegmentLength = 2;
          }
        } else {
          if (res.length > 0) { res += (separator + path.slice(lastSlash + 1, i)); } else { res = path.slice(lastSlash + 1, i); }
          lastSegmentLength = i - lastSlash - 1;
        }
        lastSlash = i;
        dots = 0;
      } else if (code === CHAR_DOT && dots !== -1) {
        ++dots;
      } else {
        dots = -1;
      }
    }
    return res;
  }

  function join () {
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0) { return '.'; }
    var joined;
    for (var i = 0; i < args.length; ++i) {
      var arg = args[i];
      if (arg.length > 0) {
        if (joined === undefined) { joined = arg; } else { joined += ('/' + arg); }
      }
    }
    if (joined === undefined) { return '.'; }
    return normalize(joined);
  }

  function normalize (path) {
    if (path.length === 0) { return '.'; }

    var isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    var trailingSeparator =
      path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;

    // Normalize the path
    path = normalizeString(path, !isAbsolute, '/', isPosixPathSeparator);

    if (path.length === 0) {
      if (isAbsolute) { return '/'; }
      return trailingSeparator ? './' : '.';
    }
    if (trailingSeparator) { path += '/'; }

    return isAbsolute ? ('/' + path) : path;
  }

  function isPosixPathSeparator (code) {
    return code === CHAR_FORWARD_SLASH;
  }

  // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety
  var MAX_ARGUMENTS_LENGTH = 0x1000;

  function alloc (num) {
    return new Uint8Array(num);
  }

  function readInt32LE (thisArg, offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, thisArg.length);

    return (thisArg[offset]) |
      (thisArg[offset + 1] << 8) |
      (thisArg[offset + 2] << 16) |
      (thisArg[offset + 3] << 24);
  }

  function readUInt32LE (thisArg, offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, thisArg.length);

    return ((thisArg[offset]) |
        (thisArg[offset + 1] << 8) |
        (thisArg[offset + 2] << 16)) +
        (thisArg[offset + 3] * 0x1000000);
  }

  function toString (thisArg) {
    var length = thisArg.length;
    if (length === 0) return '';
    return utf8Slice(thisArg, 0, length);
  }

  function slice (thisArg, start, end) {
    var len = thisArg.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }

    if (end < start) end = start;

    var newBuf = thisArg.subarray(start, end);

    return newBuf;
  }

  function utf8Slice (buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];

    var i = start;
    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = (firstByte > 0xEF) ? 4
        : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
            : 1;

      if (i + bytesPerSequence <= end) {
        var secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }
        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res);
  }

  function decodeCodePointsArray (codePoints) {
    var len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    var res = '';
    var i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
      );
    }
    return res;
  }

  function checkOffset (offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint');
    if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length');
  }

  // Extract from chromium-pickle-js 0.2.0

  // sizeof(T).
  var SIZE_INT32 = 4;
  var SIZE_UINT32 = 4;
  // var SIZE_INT64 = 8
  // var SIZE_UINT64 = 8
  // var SIZE_FLOAT = 4
  // var SIZE_DOUBLE = 8

  // The allocation granularity of the payload.
  // var PAYLOAD_UNIT = 64

  // Largest JS number.
  var CAPACITY_READ_ONLY = 9007199254740992;

  // Aligns 'i' by rounding it up to the next multiple of 'alignment'.
  var alignInt = function (i, alignment) {
    return i + (alignment - (i % alignment)) % alignment;
  };

  // PickleIterator reads data from a Pickle. The Pickle object must remain valid
  // while the PickleIterator object is in use.
  var PickleIterator = (function () {
    function PickleIterator (pickle) {
      this.payload = pickle.header;
      this.payloadOffset = pickle.headerSize;
      this.readIndex = 0;
      this.endIndex = pickle.getPayloadSize();
    }

    PickleIterator.prototype.readBool = function () {
      return this.readInt() !== 0;
    };

    PickleIterator.prototype.readInt = function () {
      return this.readBytes(SIZE_INT32, readInt32LE);
    };

    PickleIterator.prototype.readUInt32 = function () {
      return this.readBytes(SIZE_UINT32, readUInt32LE);
    };

    PickleIterator.prototype.readString = function () {
      return toString(this.readBytes(this.readInt()));
    };

    PickleIterator.prototype.readBytes = function (length, method) {
      var readPayloadOffset = this.getReadPayloadOffsetAndAdvance(length);
      if (method != null) {
        return method(this.payload, readPayloadOffset, length);
      } else {
        return slice(this.payload, readPayloadOffset, readPayloadOffset + length);
      }
    };

    PickleIterator.prototype.getReadPayloadOffsetAndAdvance = function (length) {
      if (length > this.endIndex - this.readIndex) {
        this.readIndex = this.endIndex;
        throw new Error('Failed to read data with length of ' + length);
      }
      var readPayloadOffset = this.payloadOffset + this.readIndex;
      this.advance(length);
      return readPayloadOffset;
    };

    PickleIterator.prototype.advance = function (size) {
      var alignedSize = alignInt(size, SIZE_UINT32);
      if (this.endIndex - this.readIndex < alignedSize) {
        this.readIndex = this.endIndex;
      } else {
        this.readIndex += alignedSize;
      }
    };

    return PickleIterator;
  })();

  // This class provides facilities for basic binary value packing and unpacking.
  //
  // The Pickle class supports appending primitive values (ints, strings, etc.)
  // to a pickle instance.  The Pickle instance grows its internal memory buffer
  // dynamically to hold the sequence of primitive values.   The internal memory
  // buffer is exposed as the "data" of the Pickle.  This "data" can be passed
  // to a Pickle object to initialize it for reading.
  //
  // When reading from a Pickle object, it is important for the consumer to know
  // what value types to read and in what order to read them as the Pickle does
  // not keep track of the type of data written to it.
  //
  // The Pickle's data has a header which contains the size of the Pickle's
  // payload.  It can optionally support additional space in the header.  That
  // space is controlled by the header_size parameter passed to the Pickle
  // constructor.
  var Pickle = (function () {
    function Pickle (buffer) {
      if (buffer) {
        this.initFromBuffer(buffer);
      } else {
        throw new TypeError('buffer required.');
      }
    }

    Pickle.prototype.initFromBuffer = function (buffer) {
      this.header = buffer;
      this.headerSize = buffer.length - this.getPayloadSize();
      this.capacityAfterHeader = CAPACITY_READ_ONLY;
      this.writeOffset = 0;
      if (this.headerSize > buffer.length) {
        this.headerSize = 0;
      }
      if (this.headerSize !== alignInt(this.headerSize, SIZE_UINT32)) {
        this.headerSize = 0;
      }
      if (this.headerSize === 0) {
        this.header = alloc(0);
      }
    };

    Pickle.prototype.createIterator = function () {
      return new PickleIterator(this);
    };

    Pickle.prototype.toBuffer = function () {
      return slice(this.header, 0, this.headerSize + this.getPayloadSize());
    };

    Pickle.prototype.getPayloadSize = function () {
      return readUInt32LE(this.header, 0);
    };

    return Pickle;
  })();

  function createFromBuffer (buffer) {
    return new Pickle(buffer);
  }

  function Stat (info) {
    Object.defineProperties(this, {
      _info: {
        configurable: false,
        enumerable: false,
        get: function () {
          return JSON.parse(JSON.stringify(info));
        }
      },
      size: {
        configurable: false,
        enumerable: true,
        writable: false,
        value: info.size || 0
      }
    });
  }

  Stat.prototype.isUnpacked = function isUnpacked () {
    return !!this._info.unpacked;
  };

  Stat.prototype.isDirectory = function isDirectory () {
    return !!this._info.files;
  };

  Stat.prototype.isFile = function isFile () {
    return !this._info.files && !this._info.link;
  };

  Stat.prototype.isSymbolicLink = function isSymbolicLink () {
    return !!this._info.link;
  };

  /**
   * @constructor
   * @param {Uint8Array} buffer - ASAR buffer
   */
  function Filesystem (buffer) {
    if (!(this instanceof Filesystem)) {
      return new Filesystem(buffer);
    }

    var size;
    var headerBuf;
    var sizeBuf = slice(buffer, 0, 8);

    var sizePickle = createFromBuffer(sizeBuf);
    size = sizePickle.createIterator().readUInt32();
    headerBuf = slice(buffer, 8, 8 + size);

    var headerPickle = createFromBuffer(headerBuf);
    var header = headerPickle.createIterator().readString();

    Object.defineProperties(this, {
      buffer: {
        configurable: false,
        enumerable: true,
        writable: false,
        value: buffer
      },
      headerSize: {
        configurable: false,
        enumerable: true,
        writable: false,
        value: size
      }
    });

    /** @type {{ files: { [item: string]: any } }} */
    this.header = JSON.parse(header);
  }

  function searchNodeFromDirectory (filesystem, p) {
    p = join('.', p);
    if (p === './') {
      p = '.';
    }
    var json = filesystem.header;
    var dirs = p.split('/');
    for (var i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      if (dir !== '.') {
        json = json.files[dir];
      }
    }
    return json;
  }

  /**
   * @method
   * @param {{ isPack?: boolean }=} options
   * @returns {string[]}
   */
  Filesystem.prototype.listFiles = function listFiles (options) {
    var files = [];
    var fillFilesFromHeader = function (p, json) {
      if (!json.files) {
        return;
      }
      return (function () {
        var result = [];
        for (var f in json.files) {
          var fullPath = join(p, f);
          var packState = json.files[f].unpacked === true ? 'unpack' : 'pack  ';
          files.push((options && options.isPack) ? (packState + ' : ' + fullPath) : fullPath);
          result.push(fillFilesFromHeader(fullPath, json.files[f]));
        }
        return result;
      })();
    };

    fillFilesFromHeader('/', this.header);
    return files;
  };

  function getNode (filesystem, p) {
    var node;
    try {
      node = searchNodeFromDirectory(filesystem, dirname(p));
    } catch (_) {
      throw new Error('No such file or directory: ' + p);
    }
    if (!node) {
      throw new Error('No such file or directory: ' + p);
    }
    var name = basename(p);
    if (name) {
      if (node.files) {
        return node.files[name];
      } else {
        throw new Error('No such file or directory: ' + p);
      }
    } else {
      return node;
    }
  }

  function getFile (filesystem, p, followLinks) {
    followLinks = typeof followLinks === 'undefined' ? true : followLinks;
    var info = getNode(filesystem, p);
    if (!info) {
      throw new Error('No such file or directory: ' + p);
    }
    // if followLinks is false we don't resolve symlinks
    if (info.link && followLinks) {
      return getFile(filesystem, info.link);
    } else {
      return info;
    }
  }

  /**
   * @type {((p: string) => Uint8Array) & ((p: string, toUtf8: true) => string)}
   */
  Filesystem.prototype.readFileSync = function readFileSync (p, toUtf8) {
    var info = getFile(this, p);
    if (info.size <= 0) { return new Uint8Array(0); }
    if (info.unpacked) {
      throw new Error('Cannot read unpacked file.');
    }
    var offset = 8 + this.headerSize + parseInt(info.offset);
    var buf = slice(this.buffer, offset, offset + info.size);
    if (toUtf8) {
      return toString(buf);
    } else {
      return buf;
    }
  };

  /**
   * @method
   * @param {string} p - path
   * @returns {string[]}
   */
  Filesystem.prototype.readdirSync = function readdirSync (p) {
    var info = getNode(this, p);
    if (!info.files) {
      throw new Error('Not a directory: ' + p);
    }
    var res = [];
    for (var dir in info.files) {
      res.push(dir);
    }
    return res;
  };

  /**
   * @method
   * @param {string} p - path
   * @returns {boolean}
   */
  Filesystem.prototype.existsSync = function existsSync (p) {
    try {
      getNode(this, p);
      return true;
    } catch (_) {
      return false;
    }
  };

  /**
   * @method
   * @param {string} p - path
   * @returns {Stat}
   */
  Filesystem.prototype.statSync = function statSync (p) {
    var info = getFile(this, p, true);
    return new Stat(info);
  };

  /**
   * @method
   * @param {string} p - path
   * @returns {Stat}
   */
  Filesystem.prototype.lstatSync = function lstatSync (p) {
    var info = getFile(this, p, false);
    return new Stat(info);
  };

  exports.Filesystem = Filesystem;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
