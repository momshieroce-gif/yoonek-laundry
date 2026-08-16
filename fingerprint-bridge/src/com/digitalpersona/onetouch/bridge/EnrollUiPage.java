package com.digitalpersona.onetouch.bridge;

/** Small standalone HTML/JS page for manually testing enrollment: name + scan, logs to the browser console. */
public class EnrollUiPage {

    public static final String HTML =
        "<!DOCTYPE html>\n" +
        "<html>\n" +
        "<head>\n" +
        "<meta charset=\"utf-8\">\n" +
        "<title>Fingerprint Enrollment Test</title>\n" +
        "<style>\n" +
        "  body { font-family: sans-serif; max-width: 420px; margin: 40px auto; }\n" +
        "  input { width: 100%; padding: 8px; margin: 6px 0 16px; box-sizing: border-box; }\n" +
        "  button { padding: 10px 16px; cursor: pointer; }\n" +
        "  #status { margin-top: 16px; white-space: pre-wrap; font-family: monospace; }\n" +
        "  #preview { margin-top: 16px; width: 200px; height: 240px; border: 1px solid #ccc; background: #222; object-fit: contain; display: none; }\n" +
        "</style>\n" +
        "</head>\n" +
        "<body>\n" +
        "  <h2>Fingerprint Enrollment Test</h2>\n" +
        "  <label for=\"name\">Name</label>\n" +
        "  <input id=\"name\" type=\"text\" placeholder=\"Enter full name\">\n" +
        "  <button id=\"scanBtn\">Scan Fingerprint</button>\n" +
        "  <div id=\"status\"></div>\n" +
        "  <img id=\"preview\" alt=\"Fingerprint preview\">\n" +
        "<script>\n" +
        "function nextId() {\n" +
        "  var n = parseInt(localStorage.getItem('fp_last_id') || '0', 10) + 1;\n" +
        "  localStorage.setItem('fp_last_id', String(n));\n" +
        "  return 'FP-' + String(n).padStart(4, '0');\n" +
        "}\n" +
        "var scanning = false;\n" +
        "var cancelled = false;\n" +
        "document.getElementById('scanBtn').addEventListener('click', async function () {\n" +
        "  var btn = document.getElementById('scanBtn');\n" +
        "  var statusEl = document.getElementById('status');\n" +
        "  var previewEl = document.getElementById('preview');\n" +
        "  if (scanning) {\n" +
        "    cancelled = true;\n" +
        "    await fetch('/api/enroll/cancel', { method: 'POST' });\n" +
        "    return;\n" +
        "  }\n" +
        "  var name = document.getElementById('name').value.trim();\n" +
        "  if (!name) { statusEl.textContent = 'Please enter a name first.'; return; }\n" +
        "  var id = nextId();\n" +
        "  scanning = true;\n" +
        "  cancelled = false;\n" +
        "  btn.textContent = 'Cancel';\n" +
        "  previewEl.style.display = 'none';\n" +
        "  statusEl.textContent = 'Starting enrollment...';\n" +
        "  try {\n" +
        "    var start = await (await fetch('/api/enroll/start', { method: 'POST' })).json();\n" +
        "    if (!start.active) {\n" +
        "      console.log({ id: id, name: name, success: false, message: start.message });\n" +
        "      statusEl.textContent = 'Failed: ' + start.message;\n" +
        "      return;\n" +
        "    }\n" +
        "    statusEl.textContent = 'Fingerprint samples needed: ' + start.samplesNeeded + ' -- scan the reader now.';\n" +
        "    while (!cancelled) {\n" +
        "      await new Promise(function (r) { setTimeout(r, 500); });\n" +
        "      var data = await (await fetch('/api/enroll/status')).json();\n" +
        "      if (data.previewImage) {\n" +
        "        previewEl.src = 'data:image/png;base64,' + data.previewImage;\n" +
        "        previewEl.style.display = 'block';\n" +
        "      }\n" +
        "      if (!data.done) {\n" +
        "        statusEl.textContent = (data.message || 'Scanning...') + ' (samples needed: ' + data.samplesNeeded + ')';\n" +
        "        continue;\n" +
        "      }\n" +
        "      console.log({ id: id, name: name, success: data.success, template: data.template, message: data.message });\n" +
        "      statusEl.textContent = data.success\n" +
        "        ? ('Enrolled ' + name + ' (' + id + '). Check the console for the template.')\n" +
        "        : ('Failed: ' + data.message);\n" +
        "      break;\n" +
        "    }\n" +
        "    if (cancelled) statusEl.textContent = 'Cancelled.';\n" +
        "  } catch (err) {\n" +
        "    console.log({ id: id, name: name, success: false, message: err.message });\n" +
        "    statusEl.textContent = 'Error: ' + err.message;\n" +
        "  } finally {\n" +
        "    scanning = false;\n" +
        "    btn.textContent = 'Scan Fingerprint';\n" +
        "  }\n" +
        "});\n" +
        "</script>\n" +
        "</body>\n" +
        "</html>\n";
}
