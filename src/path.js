var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
// var CHAR_BACKWARD_SLASH = 92;

export function isAbsolute (path) {
  return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
}

export function basename (path, ext) {
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

export function dirname (path) {
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
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
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

export function join () {
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
