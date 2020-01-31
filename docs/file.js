(function (window) {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx;
  var source;
  var activeListItem = null;

  var input = document.getElementById('fileInput');
  var left = document.getElementById('left');
  var right = document.getElementById('right');

  var fs;

  input.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    stopBGM();
    var arr = file.name.split('.');
    if (arr[arr.length - 1] !== 'asar') {
      throw new Error('Not an asar file.');
    }
    var reader = new FileReader();
    reader.onloadend = function (e) {
      var buf = new Uint8Array(e.target.result);
      try {
        fs = new asar.Filesystem(buf);
      } catch (err) {
        throw new Error('Invalid asar file: ' + err.message);
      }

      makeEmpty(left);
      activeListItem = null;
      makeEmpty(right);
      renderList('/', 0, fs);
    };
    reader.readAsArrayBuffer(file);
  });

  left.addEventListener('click', function (event) {
    var target = event.target;
    if (target.className.indexOf('list-item') === -1) return;
    var stat = target._stat;
    var path = target._path;
    var arr = path.split('.');
    var ext;
    if (arr.length === 1) {
      ext = '';
    } else {
      ext = '.' + arr[arr.length - 1];
    }
    if (!stat.isDirectory()) {
      var content;
      try {
        if (ext === '.mp3') {
          playBGM(path);
        } else if (ext === '.png') {
          setPicture(fs.readFileSync(path));
        } else {
          content = fs.readFileSync(path, true);
          if (content.length > 1024 * 1024) {
            throw new Error('Too large file.');
          }
          setText(content, '#000');
        }
      } catch (err) {
        setText(err.message, 'red');
      }
      if (activeListItem) {
        activeListItem.style.color = '';
      }
      target.style.color = 'blue';
      activeListItem = target;
    }
  });

  function renderList (root, indent) {
    var ls = fs.readdirSync(root);
    for (var i = 0; i < ls.length; i++) {
      var div = document.createElement('div');
      div.innerHTML = ls[i];
      div.className = 'list-item';
      if (indent > 0) {
        div.style.paddingLeft = (indent * 10) + 'px';
      }
      var item = join(root, ls[i]);
      var stat = fs.statSync(item);
      div._stat = stat;
      div._path = item;
      left.appendChild(div);
      if (stat.isDirectory()) {
        div.innerHTML = '[' + div.innerHTML + ']';
        div.style.cursor = 'default';
        renderList(item, indent + 2, fs);
      }
    }
  }

  function join (a, b) {
    if (a[a.length - 1] === '/') {
      return a + b;
    }
    return a + '/' + b;
  }

  function makeEmpty (dom) {
    while (dom.hasChildNodes()) {
      dom.removeChild(dom.childNodes[0]);
    }
  }

  function setText (content, color) {
    makeEmpty(right);
    var pre = document.createElement('pre');
    pre.innerHTML = content;
    pre.style.color = color;
    right.appendChild(pre);
  }

  function setPicture (content) {
    makeEmpty(right);
    var img = document.createElement('img');
    img.src = 'data:image/png;base64,' + base64.fromByteArray(content);
    right.appendChild(img);
  }

  function playBGM (path) {
    makeEmpty(right);
    if (!AudioContext) {
      throw new Error('Your browser does not support AudioContext.');
    }

    ctx = ctx || new AudioContext();
    stopBGM();
    source = ctx.createBufferSource();
    var data = fs.readFileSync(path);
    ctx.decodeAudioData(data.buffer, function (buffer) {
      source.buffer = buffer;
      source.connect(ctx.destination);
      // source.loop = true;
      source.start(0);
    }, function (err) {
      setText(err.message, 'red');
    });
  }

  function stopBGM () {
    if (source) {
      source.stop();
      source.disconnect();
    }
  }
})(window);
