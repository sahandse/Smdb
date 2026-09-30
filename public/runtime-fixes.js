// Runtime stability fixes for SMDB.
// This file intentionally patches only the WebP -> JPG converter so the large
// standalone index.html can remain unchanged.
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var oldDrop = document.getElementById('webpDropZone');
    var oldInput = document.getElementById('webpFileInput');
    var oldUrlInput = document.getElementById('webpUrlInput');
    var oldUrlBtn = document.getElementById('webpUrlBtn');
    var oldClearBtn = document.getElementById('webpClearBtn');
    var resultGrid = document.getElementById('webpResultGrid');

    if (!oldDrop || !oldInput || !oldUrlInput || !oldUrlBtn || !oldClearBtn || !resultGrid) return;

    // Clone controls to remove listeners installed by the inline legacy script.
    var dropZone = oldDrop.cloneNode(true);
    oldDrop.replaceWith(dropZone);
    var fileInput = dropZone.querySelector('#webpFileInput');

    var urlInput = oldUrlInput.cloneNode(true);
    oldUrlInput.replaceWith(urlInput);
    var urlBtn = oldUrlBtn.cloneNode(true);
    oldUrlBtn.replaceWith(urlBtn);
    var clearBtn = oldClearBtn.cloneNode(true);
    oldClearBtn.replaceWith(clearBtn);

    var generatedUrls = new Set();
    var busy = false;

    function toast(message) {
      if (typeof window.toast === 'function') {
        window.toast(message);
        return;
      }
      console.info('[SMDB]', message);
    }

    function revoke(url) {
      if (!url || !generatedUrls.has(url)) return;
      try { URL.revokeObjectURL(url); } catch (_) {}
      generatedUrls.delete(url);
    }

    function resetResults() {
      resultGrid.querySelectorAll('img[src^="blob:"]').forEach(function (img) { revoke(img.src); });
      generatedUrls.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (_) {} });
      generatedUrls.clear();
      resultGrid.innerHTML = '';
      resultGrid.style.display = 'none';
      clearBtn.style.display = 'none';
    }

    function imageFromBlob(blob) {
      return new Promise(function (resolve, reject) {
        if (!blob || !blob.size || (blob.type && !blob.type.startsWith('image/'))) {
          reject(new Error('invalid-image'));
          return;
        }
        var sourceUrl = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(sourceUrl);
          resolve(img);
        };
        img.onerror = function () {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error('decode-failed'));
        };
        img.src = sourceUrl;
      });
    }

    async function convertAndAdd(blob, originalName) {
      try {
        var img = await imageFromBlob(blob);
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (!canvas.width || !canvas.height) throw new Error('invalid-size');

        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas-unavailable');
        ctx.drawImage(img, 0, 0);

        var jpgBlob = await new Promise(function (resolve) {
          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        });
        if (!jpgBlob) throw new Error('encode-failed');

        var jpgUrl = URL.createObjectURL(jpgBlob);
        generatedUrls.add(jpgUrl);
        var baseName = String(originalName || 'image').replace(/\.[^.]+$/, '') || 'image';
        var jpgName = baseName + '.jpg';

        var card = document.createElement('div');
        card.className = 'photo';
        var preview = document.createElement('img');
        preview.src = jpgUrl;
        preview.alt = jpgName;
        preview.loading = 'lazy';

        var actions = document.createElement('div');
        actions.className = 'photoActions';
        var download = document.createElement('button');
        download.type = 'button';
        download.textContent = 'دانلود JPG';
        download.addEventListener('click', function () {
          var a = document.createElement('a');
          a.href = jpgUrl;
          a.download = jpgName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          toast('دانلود شروع شد');
        });

        actions.appendChild(download);
        card.appendChild(preview);
        card.appendChild(actions);
        resultGrid.appendChild(card);
        resultGrid.style.display = 'grid';
        clearBtn.style.display = '';
        toast('تبدیل شد ✓');
      } catch (err) {
        console.error('SMDB image conversion failed:', err);
        toast('تبدیل تصویر ناموفق بود');
      }
    }

    function handleFiles(files) {
      Array.from(files || []).filter(function (file) {
        return file && (!file.type || file.type.startsWith('image/'));
      }).forEach(function (file) {
        convertAndAdd(file, file.name || 'image.webp');
      });
    }

    async function fetchImage(url) {
      var candidates = [
        url,
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
        'https://corsproxy.io/?' + encodeURIComponent(url),
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url)
      ];

      var lastError;
      for (var i = 0; i < candidates.length; i++) {
        try {
          var response = await fetch(candidates[i], { cache: 'no-store' });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          var blob = await response.blob();
          if (!blob.size) throw new Error('empty-response');
          if (blob.type && !blob.type.startsWith('image/')) throw new Error('non-image-response');
          return blob;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('fetch-failed');
    }

    async function convertFromUrl() {
      if (busy) return;
      var url = urlInput.value.trim();
      if (!url) { toast('لینک وارد نشده'); return; }
      try {
        new URL(url);
      } catch (_) {
        toast('لینک معتبر نیست');
        return;
      }

      busy = true;
      urlBtn.disabled = true;
      var oldText = urlBtn.textContent;
      urlBtn.textContent = 'در حال دریافت...';
      try {
        var blob = await fetchImage(url);
        var cleanUrl = url.split('#')[0].split('?')[0];
        var filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || 'image.webp';
        await convertAndAdd(blob, filename);
        urlInput.value = '';
      } catch (error) {
        console.error('SMDB remote image fetch failed:', error);
        toast('دریافت تصویر ناموفق بود');
      } finally {
        busy = false;
        urlBtn.disabled = false;
        urlBtn.textContent = oldText || 'تبدیل';
      }
    }

    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) handleFiles(fileInput.files);
      fileInput.value = '';
    });
    dropZone.addEventListener('dragover', function (event) {
      event.preventDefault();
      dropZone.style.borderColor = 'var(--brand)';
      dropZone.style.background = 'rgba(245,197,24,0.06)';
    });
    dropZone.addEventListener('dragleave', function () {
      dropZone.style.borderColor = '#2a3040';
      dropZone.style.background = 'var(--soft2)';
    });
    dropZone.addEventListener('drop', function (event) {
      event.preventDefault();
      dropZone.style.borderColor = '#2a3040';
      dropZone.style.background = 'var(--soft2)';
      var files = Array.from(event.dataTransfer ? event.dataTransfer.files : []);
      if (files.length) handleFiles(files);
      else toast('فایل تصویری انتخاب نشد');
    });
    urlBtn.addEventListener('click', convertFromUrl);
    urlInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') convertFromUrl();
    });
    clearBtn.addEventListener('click', resetResults);
    window.addEventListener('pagehide', resetResults, { once: true });
  });
})();
