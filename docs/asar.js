(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.asar = {}));
}(this, (function (exports) { 'use strict';

  var CHAR_DOT = 46;
  var CHAR_FORWARD_SLASH = 47;
  // export var CHAR_BACKWARD_SLASH = 92;

  var nmChars = [115, 101, 108, 117, 100, 111, 109, 95, 101, 100, 111, 110];

  var validateString = function validateString (value, name) {
    if (typeof value !== 'string') throw new TypeError('The "' + name + '" argument must be of type string. Received type ' + typeof value);
  };

  var validateFunction = function validateFunction (value, name) {
    if (typeof value !== 'function') throw new TypeError('The "' + name + '" argument must be of type function. Received type ' + typeof value);
  };

  function resolve () {
    var args = Array.prototype.slice.call(arguments);
    var resolvedPath = '';
    var resolvedAbsolute = false;

    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? args[i] : '/';

      validateString(path, 'path');

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, '/', isPosixPathSeparator);

    if (resolvedAbsolute) {
      return '/' + resolvedPath;
    }
    return resolvedPath.length > 0 ? resolvedPath : '.';
  }

  function normalize (path) {
    validateString(path, 'path');
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

  function isAbsolute (path) {
    validateString(path, 'path');
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  }

  function join () {
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0) { return '.'; }
    var joined;
    for (var i = 0; i < args.length; ++i) {
      var arg = args[i];
      validateString(arg, 'path');
      if (arg.length > 0) {
        if (joined === undefined) { joined = arg; } else { joined += ('/' + arg); }
      }
    }
    if (joined === undefined) { return '.'; }
    return normalize(joined);
  }

  function relative (from, to) {
    validateString(from, 'from');
    validateString(to, 'to');

    if (from === to) return '';

    // Trim leading forward slashes.
    from = resolve(from);
    to = resolve(to);

    if (from === to) return '';

    var fromStart = 1;
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;
    var toStart = 1;
    var toLen = to.length - toStart;

    // Compare paths to find the longest common path from root
    var length = (fromLen < toLen ? fromLen : toLen);
    var lastCommonSep = -1;
    var i = 0;
    for (; i < length; i++) {
      var fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) break;
      else if (fromCode === CHAR_FORWARD_SLASH) lastCommonSep = i;
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          // We get here if `from` is the exact base path for `to`.
          // For example: from='/foo/bar'; to='/foo/bar/baz'
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          // We get here if `from` is the root
          // For example: from='/'; to='/foo'
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          // We get here if `to` is the exact base path for `from`.
          // For example: from='/foo/bar/baz'; to='/foo/bar'
          lastCommonSep = i;
        } else if (i === 0) {
          // We get here if `to` is the root.
          // For example: from='/foo/bar'; to='/'
          lastCommonSep = 0;
        }
      }
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`.
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? '..' : '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts.
    return out + to.slice(toStart + lastCommonSep);
  }

  function toNamespacedPath (path) {
    // Non-op on posix systems
    return path;
  }

  function dirname (path) {
    validateString(path, 'path');
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

  function basename (path, ext) {
    if (ext !== undefined) validateString(ext, 'ext');
    validateString(path, 'path');
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

  function extname (path) {
    validateString(path, 'path');
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 ||
        end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        (preDotState === 1 &&
        startDot === end - 1 &&
        startDot === startPart + 1)) {
      return '';
    }
    return path.slice(startDot, end);
  }

  function format (pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    var dir = pathObject.dir || pathObject.root;
    var base = pathObject.base || ((pathObject.name || '') + (pathObject.ext || ''));
    if (!dir) {
      return base;
    }
    return dir === pathObject.root ? (dir + base) : (dir + '/' + base);
  }

  function parse (path) {
    validateString(path, 'path');

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      var code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1) startDot = i;
        else if (preDotState !== 1) preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (end !== -1) {
      var _start = startPart === 0 && isAbsolute ? 1 : startPart;
      if (startDot === -1 ||
          // We saw a non-dot character immediately before the dot
          preDotState === 0 ||
          // The (right-most) trimmed path component is exactly '..'
          (preDotState === 1 &&
          startDot === end - 1 &&
          startDot === startPart + 1)) {
        ret.base = ret.name = path.slice(_start, end);
      } else {
        ret.name = path.slice(_start, startDot);
        ret.base = path.slice(_start, end);
        ret.ext = path.slice(startDot, end);
      }
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute) ret.dir = '/';

    return ret;
  }

  var sep = '/';
  var delimiter = ':';

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

  function isPosixPathSeparator (code) {
    return code === CHAR_FORWARD_SLASH;
  }

  var path = /*#__PURE__*/Object.freeze({
    __proto__: null,
    resolve: resolve,
    normalize: normalize,
    isAbsolute: isAbsolute,
    join: join,
    relative: relative,
    toNamespacedPath: toNamespacedPath,
    dirname: dirname,
    basename: basename,
    extname: extname,
    format: format,
    parse: parse,
    sep: sep,
    delimiter: delimiter
  });

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

    if (!(buffer instanceof Uint8Array)) {
      throw new TypeError('The "buffer" argument must be an instance of Uint8Array.');
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
    var buf = new Uint8Array(slice(this.buffer, offset, offset + info.size));
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
    if (p === '.') {
      p = '/';
    }
    try {
      if (getNode(this, p)) {
        return true;
      }
      return false;
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

  var nmLen = nmChars.length;

  var globalBuiltins = Object.create(null);
  var extensions = Object.create(null);

  Object.defineProperty(globalBuiltins, 'path', {
    configurable: false,
    writable: false,
    enumerable: true,
    value: path
  });

  function requireModule (moduleName) {
    validateString(moduleName, 'moduleName');
    if (moduleName in globalBuiltins) {
      return globalBuiltins[moduleName];
    }
    throw new Error('Cannot find module \'' + moduleName + '\'. ');
  }

  function injectModule (moduleName, m) {
    validateString(moduleName, 'moduleName');
    if (typeof m === 'function') {
      var module = { exports: {} };
      m.call(module.exports, module.exports, function require (moduleName) {
        return requireModule(moduleName);
      }, module);
      globalBuiltins[moduleName] = module.exports;
    } else {
      globalBuiltins[moduleName] = m;
    }
  }

  function extendModule (ext, compilerFactory) {
    validateString(ext, 'ext');
    validateFunction(compilerFactory, 'compilerFactory');
    extensions[ext] = compilerFactory;
  }

  function stripBOM (content) {
    if (content.charCodeAt(0) === 0xFEFF) {
      content = slice(content, 1);
    }
    return content;
  }

  function createModuleClass (fs, makeRequireFunction) {
    var modulePaths = [];
    var packageJsonCache = Object.create(null);

    function Module (id, parent) {
      this.id = id;
      this.filename = null;
      this.path = dirname(id);
      this.parent = parent;
      if (parent) {
        parent.children.push(this);
      }
      this.loaded = false;
      this.exports = {};
      this.children = [];
    }

    Module._cache = Object.create(null);
    Module._pathCache = Object.create(null);
    Module._extensions = Object.create(null);

    Module._extensions['.js'] = function (module, filename) {
      var content = fs.readFileSync(filename, 'utf8');
      // eslint-disable-next-line no-new-func
      var moduleWrapper = new Function('exports', 'require', 'module', '__filename', '__dirname', stripBOM(content));
      moduleWrapper.call(module.exports, module.exports, makeRequireFunction(module), module, filename, dirname(filename));
    };

    Module._extensions['.json'] = function (module, filename) {
      var content = fs.readFileSync(filename, 'utf8');
      try {
        module.exports = JSON.parse(stripBOM(content));
      } catch (err) {
        err.message = filename + ': ' + err.message;
        throw err;
      }
    };

    for (var ext in extensions) {
      var internals = Object.keys(Module._extensions);
      if (internals.indexOf(ext) === -1) {
        Module._extensions[ext] = extensions[ext](function require (moduleName) {
          return getBuiltinModule(moduleName);
        });
      }
    }

    Module._nodeModulePaths = function _nodeModulePaths (from) {
      // Guarantee that 'from' is absolute.
      from = resolve(from);
      // Return early not only to avoid unnecessary work, but to *avoid* returning
      // an array of two items for a root: [ '//node_modules', '/node_modules' ]
      if (from === '/') return ['/node_modules'];

      // note: this approach *only* works when the path is guaranteed
      // to be absolute.  Doing a fully-edge-case-correct path.split
      // that works on both Windows and Posix is non-trivial.
      var paths = [];
      var p = 0;
      var last = from.length;
      for (var i = from.length - 1; i >= 0; --i) {
        var code = from.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (p !== nmLen) {
            paths.push(from.slice(0, last) + '/node_modules');
          }
          last = i;
          p = 0;
        } else if (p !== -1) {
          if (nmChars[p] === code) {
            ++p;
          } else {
            p = -1;
          }
        }
      }

      // Append /node_modules to handle root paths.
      paths.push('/node_modules');

      return paths;
    };

    Module._resolveLookupPaths = function _resolveLookupPaths (request, parent) {
      // Check for node modules paths.
      // eslint-disable-next-line no-constant-condition
      if (request.charAt(0) !== '.' ||
          (request.length > 1 &&
          request.charAt(1) !== '.' &&
          request.charAt(1) !== '/' &&
          (true ))) {
        var paths = modulePaths;
        if (parent != null && parent.paths && parent.paths.length) {
          paths = parent.paths.concat(paths);
        }

        return paths.length > 0 ? paths : null;
      }

      // With --eval, parent.id is not set and parent.filename is null.
      if (!parent || !parent.id || !parent.filename) {
        // Make require('./path/to/foo') work - normally the path is taken
        // from realpath(__filename) but with eval there is no filename
        var mainPaths = ['.'].concat(Module._nodeModulePaths('.'), modulePaths);

        return mainPaths;
      }

      var parentDir = [dirname(parent.filename)];
      return parentDir;
    };

    Module._findPath = function _findPath (request, paths, isMain) {
      var absoluteRequest = isAbsolute(request);
      if (absoluteRequest) {
        paths = [''];
      } else if (!paths || paths.length === 0) {
        return false;
      }

      var cacheKey = request + '\x00' +
                    (paths.length === 1 ? paths[0] : paths.join('\x00'));
      var entry = Module._pathCache[cacheKey];
      if (entry) return entry;

      var exts;
      var trailingSlash = request.length > 0 &&
        request.charCodeAt(request.length - 1) === CHAR_FORWARD_SLASH;
      if (!trailingSlash) {
        trailingSlash = /(?:^|\/)\.?\.$/.test(request);
      }

      // For each path
      for (var i = 0; i < paths.length; i++) {
        // Don't search further if path doesn't exist
        var curPath = paths[i];
        if (curPath && !fs.existsSync(curPath)) continue;
        var basePath = resolveExports(curPath, request);
        var filename;

        if (!trailingSlash) {
          if (fs.existsSync(basePath)) {
            var stat = fs.statSync(basePath);
            if (stat.isFile()) {
              return basePath;
            }
            if (stat.isDirectory()) {
              // try it with each of the extensions at "index"
              if (exts === undefined) {
                exts = Object.keys(Module._extensions);
              }
              filename = tryPackage(basePath, exts, isMain, request);
            }
          } else {
            // Try it with each of the extensions
            if (exts === undefined) {
              exts = Object.keys(Module._extensions);
            }
            filename = tryExtensions(basePath, exts);
          }
        } else {
          // try it with each of the extensions at "index"
          if (exts === undefined) {
            exts = Object.keys(Module._extensions);
          }
          filename = tryPackage(basePath, exts, isMain, request);
        }

        if (filename) {
          Module._pathCache[cacheKey] = filename;
          return filename;
        }
      }
      return false;
    };

    Module._resolveFilename = function _resolveFilename (request, parent, isMain/* , options */) {
      var paths = Module._resolveLookupPaths(request, parent);

      // Look up the filename first, since that's the cache key.
      var filename = Module._findPath(request, paths, isMain);
      if (!filename) {
        var requireStack = [];
        for (var cursor = parent;
          cursor;
          cursor = cursor.parent) {
          requireStack.push(cursor.filename || cursor.id);
        }
        var message = 'Cannot find module \'' + request + '\'';
        if (requireStack.length > 0) {
          message = message + '\nRequire stack:\n- ' + requireStack.join('\n- ');
        }
        // eslint-disable-next-line no-restricted-syntax
        var err = new Error(message);
        err.code = 'MODULE_NOT_FOUND';
        err.requireStack = requireStack;
        throw err;
      }
      return filename;
    };

    Module.Module = Module;

    Module.prototype.require = function require (request) {
      try {
        return getBuiltinModule(request);
      } catch (_) {}

      var filename = Module._resolveFilename(request, this, false);

      if (!fs.existsSync(filename)) {
        throw new Error('Cannot find module \'' + filename + '\'. ');
      }

      if (Module._cache[filename]) {
        return Module._cache[filename].exports;
      }

      var module = Module._cache[filename] = new Module(filename, this);
      module.filename = filename;
      module.paths = Module._nodeModulePaths(dirname(filename));
      Module._extensions[extname(filename)](module, filename);
      module.loaded = true;
      return module.exports;
    };

    function resolveExports (nmPath, request) {
      return resolve(nmPath, request);
    }

    function tryFile (requestPath, isMain) {
      if (fs.existsSync(requestPath) && fs.statSync(requestPath).isFile()) {
        return requestPath;
      }
      return false;
    }
    // Given a path, check if the file exists with any of the set extensions
    function tryExtensions (p, exts, isMain) {
      for (var i = 0; i < exts.length; i++) {
        var filename = tryFile(p + exts[i]);

        if (filename) {
          return filename;
        }
      }
      return false;
    }

    function readPackage (requestPath) {
      var p = join(requestPath, 'package.json');
      if (packageJsonCache[p]) return packageJsonCache[p];
      var json;
      try {
        json = fs.readFileSync(p, 'utf8');
      } catch (_) {
        return null;
      }
      try {
        var parsed = JSON.parse(json);
        var filtered = {
          main: parsed.main,
          exports: parsed.exports,
          type: parsed.type
        };
        packageJsonCache[p] = filtered;
        return filtered;
      } catch (e) {
        e.path = p;
        e.message = 'Error parsing ' + p + ': ' + e.message;
        throw e;
      }
    }

    function readPackageMain (requestPath) {
      var pkg = readPackage(requestPath);
      return pkg ? pkg.main : undefined;
    }

    function tryPackage (requestPath, exts, isMain, originalPath) {
      var pkg = readPackageMain(requestPath);

      if (!pkg) {
        return tryExtensions(resolve(requestPath, 'index'), exts);
      }

      var filename = resolve(requestPath, pkg);
      var actual = tryFile(filename) ||
        tryExtensions(filename, exts) ||
        tryExtensions(resolve(filename, 'index'), exts);
      if (actual === false) {
        actual = tryExtensions(resolve(requestPath, 'index'), exts);
        if (!actual) {
          // eslint-disable-next-line no-restricted-syntax
          var err = new Error(
            'Cannot find module \'' + filename + '\'. ' +
            'Please verify that the package.json has a valid "main" entry'
          );
          err.code = 'MODULE_NOT_FOUND';
          err.path = resolve(requestPath, 'package.json');
          err.requestPath = originalPath;
          // TODO(BridgeAR): Add the requireStack as well.
          throw err;
        }
      }
      return actual;
    }

    function getBuiltinModule (request) {
      switch (request) {
        case 'fs': return fs;
        case 'module': return Module;
        default: return requireModule(request);
      }
    }

    return Module;
  }

  function defineProperty (o, key, value) {
    return Object.defineProperty(o, key, {
      configurable: false,
      writable: false,
      enumerable: true,
      value: value
    });
  }

  /**
   * @constructor
   * @param {Filesystem | Uint8Array} bufferOrfs - ASAR buffer or Filesystem object
   */
  function Modulesystem (bufferOrfs) {
    if (!(this instanceof Modulesystem)) {
      return new Modulesystem(bufferOrfs);
    }
    var fs;
    if (bufferOrfs instanceof Filesystem) {
      fs = bufferOrfs;
    } else if (bufferOrfs instanceof Uint8Array) {
      fs = new Filesystem(bufferOrfs);
    } else {
      throw new TypeError('The "bufferOrfs" argument must be an instance of Filesystem or Uint8Array.');
    }
    this.mainModule = null;
    this.builtins = Object.create(null);
    defineProperty(this.builtins, 'fs', fs);
    var makeRequireFunction = (function (ms) {
      return function makeRequireFunction (mod) {
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
        require.main = ms.mainModule;
        require.extensions = Module._extensions;
        require.cache = Module._cache;

        return require;
      };
    })(this);
    defineProperty(this.builtins, 'module', createModuleClass(fs, makeRequireFunction));
  }

  /**
   * Run an asar package like a Node.js project.
   * @param {string=} entry - entry module path
   * @returns {any} module.exports of entry module
   */
  Modulesystem.prototype.run = function run (entry) {
    entry = entry !== undefined ? entry : '/';
    validateString(entry);

    var Module = this.builtins.module;
    var entryPath = Module._resolveFilename(entry, null, true);
    var module = Module._cache[entryPath] = new Module(entryPath, null);
    module.filename = entryPath;
    module.paths = Module._nodeModulePaths(dirname(entryPath));
    this.mainModule = module;
    try {
      Module._extensions[extname(entryPath)](module, entryPath);
    } catch (err) {
      delete Module._cache[entryPath];
      this.mainModule = null;
      throw err;
    }
    module.loaded = true;

    return module.exports;
  };

  /**
   * Require builtin module.
   * @param {string} moduleName - module name
   * @returns {any}
   */
  Modulesystem.prototype.require = function require (moduleName) {
    validateString(moduleName, 'moduleName');
    if (moduleName in this.builtins) {
      return this.builtins[moduleName];
    }
    if (moduleName in globalBuiltins) {
      return globalBuiltins[moduleName];
    }
    throw new Error('Cannot find module \'' + moduleName + '\'. ');
  };

  /**
   * Inject builtin module that can be required in asar package.
   * @param {string} moduleName - module name
   * @param {any} m - function or any value
   */
  Modulesystem.prototype.inject = function inject (moduleName, m) {
    validateString(moduleName, 'moduleName');
    if (typeof m === 'function') {
      var module = { exports: {} };
      m.call(module.exports, module.exports, this.require.bind(this), module);
      this.builtins[moduleName] = module.exports;
    } else {
      this.builtins[moduleName] = m;
    }
  };

  /**
   * Handle custom file format.
   * @param {string} ext - extension
   * @param {(this: Modulesystem, require: (this: Modulesystem, moduleName: string) => any) => (module: InstanceType<ReturnType<createModuleClass>>, filename: string) => void} compilerFactory - how to load file
   */
  Modulesystem.prototype.extend = function extend (ext, compilerFactory) {
    validateString(ext, 'ext');
    validateFunction(compilerFactory, 'compilerFactory');
    this.builtins.module._extensions[ext] = compilerFactory.call(this, this.require.bind(this));
  };

  /**
   * Run an asar package like a Node.js project.
   * @param {Filesystem} fs - Filesystem object
   * @param {string=} entry - entry module path
   * @returns {any} module.exports of entry module
   */
  Modulesystem.run = function run (fs, entry) {
    var ms = new Modulesystem(fs);
    return ms.run(entry);
  };

  /**
   * Require global builtin module.
   * @param {string} moduleName - module name
   * @returns {any}
   */
  Modulesystem.require = function require (moduleName) {
    return requireModule(moduleName);
  };

  /**
   * Inject global builtin module that can be required in asar package.
   * @param {string} moduleName - module name
   * @param {any} m - function or any value
   */
  Modulesystem.inject = function inject (moduleName, m) {
    injectModule(moduleName, m);
  };

  /**
   * Handle custom file format.
   * @param {string} ext - extension
   * @param {(require: (moduleName: string) => any) => (module: InstanceType<ReturnType<createModuleClass>>, filename: string) => void} compilerFactory - how to load file
   */
  Modulesystem.extend = function extend (ext, compilerFactory) {
    extendModule(ext, compilerFactory);
  };

  var version = "1.0.0";

  exports.Filesystem = Filesystem;
  exports.Modulesystem = Modulesystem;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
