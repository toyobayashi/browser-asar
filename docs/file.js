(function (window) {
  var input = document.getElementById('fileInput');
  var left = document.getElementById('left');
  var right = document.getElementById('right');

  var fs;

  input.addEventListener('change', function (e) {
    var file = e.target.files[0];
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

      while (left.hasChildNodes()) {
        left.removeChild(left.childNodes[0]);
      }
      renderList('/', 0, fs);
    };
    reader.readAsArrayBuffer(file);
  });

  left.addEventListener('click', function (event) {
    var target = event.target;
    if (target.className.indexOf('list-item') === -1) return;
    var stat = target._stat;
    var path = target._path;
    if (!stat.isDirectory()) {
      var content;
      try {
        content = fs.readFileSync(path, true);
        right.innerHTML = content;
        right.style.color = '#000';
      } catch (err) {
        right.innerHTML = err.message;
        right.style.color = 'red';
      }
      var items = left.getElementsByTagName('div');
      for (var i = 0; i < items.length; i++) {
        items[i].style.color = '#000';
      }
      target.style.color = 'blue';
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
      div._fs = fs;
      left.appendChild(div);
      if (stat.isDirectory()) {
        div.innerHTML = '[' + div.innerHTML + ']';
        div.style.cursor = 'default';
        renderList(item, indent + 2, fs);
      }
    }
  }

  function join (a, b) {
    return a + '/' + b;
  }
})(window);
