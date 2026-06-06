/**
 * Ohm My God — data persistence layer (Phase 3)
 *
 * Backends:
 *   fetch       — read via HTTP (local dev / GitHub Pages); no writes
 *   github      — read/write via GitHub Contents API (GET + PUT with SHA)
 *   filesystem  — read/write via File System Access API (offline shared drive)
 */
(function (global) {
  "use strict";

  const DATA_FILES = ["tree.json", "cases.json", "pending.json", "changelog.json"];
  const ARRAY_FILES = new Set(["cases.json", "pending.json", "changelog.json"]);

  const CONFIG_KEYS = {
    mode: "ohmg_storage_mode",
    githubToken: "ohmg_github_token",
    githubOwner: "ohmg_github_owner",
    githubRepo: "ohmg_github_repo",
    githubBranch: "ohmg_github_branch"
  };

  const IDB_NAME = "ohmg-storage";
  const IDB_VERSION = 1;
  const IDB_STORE = "handles";
  const DIR_HANDLE_KEY = "dataDir";

  const shaCache = Object.create(null);

  function getConfig() {
    return {
      mode: localStorage.getItem(CONFIG_KEYS.mode) || "fetch",
      githubToken: localStorage.getItem(CONFIG_KEYS.githubToken) || "",
      githubOwner: localStorage.getItem(CONFIG_KEYS.githubOwner) || "",
      githubRepo: localStorage.getItem(CONFIG_KEYS.githubRepo) || "",
      githubBranch: localStorage.getItem(CONFIG_KEYS.githubBranch) || "main"
    };
  }

  function saveConfig(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      const storageKey = CONFIG_KEYS[key];
      if (!storageKey) return;
      if (value === null || value === undefined || value === "") {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, value);
      }
    });
  }

  async function prepare() {
    if (getConfig().mode === "filesystem") {
      cachedDirHandle = await loadDirHandle();
    }
  }

  function canWrite() {
    const { mode, githubToken, githubOwner, githubRepo } = getConfig();
    if (mode === "github") {
      return Boolean(githubToken && githubOwner && githubRepo);
    }
    if (mode === "filesystem") {
      return typeof showDirectoryPicker !== "undefined" && Boolean(cachedDirHandle);
    }
    return false;
  }

  function getStatus() {
    const config = getConfig();
    if (config.mode === "github") {
      if (canWrite()) {
        return {
          mode: "github",
          label: `GitHub: ${config.githubOwner}/${config.githubRepo}`,
          writable: true
        };
      }
      return {
        mode: "github",
        label: "GitHub (not configured)",
        writable: false
      };
    }
    if (config.mode === "filesystem") {
      return {
        mode: "filesystem",
        label: cachedDirHandle ? "Shared folder" : "Shared folder (not connected)",
        writable: canWrite()
      };
    }
    return { mode: "fetch", label: "Local (read-only)", writable: false };
  }

  async function loadJsonViaFetch(filename) {
    const res = await fetch(filename, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load ${filename} (${res.status})`);
    }
    return res.json();
  }

  function githubApiUrl(filename, config) {
    const { githubOwner, githubRepo, githubBranch } = config;
    const path = encodeURIComponent(filename).replace(/%2F/g, "/");
    return `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}?ref=${encodeURIComponent(githubBranch)}`;
  }

  function decodeBase64Utf8(b64) {
    const binary = atob(b64.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  async function readFromGitHub(filename, config) {
    const res = await fetch(githubApiUrl(filename, config), {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });

    if (res.status === 404) {
      if (ARRAY_FILES.has(filename)) {
        shaCache[filename] = null;
        return [];
      }
      throw new Error(`${filename} not found in GitHub repo`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub read failed for ${filename}: ${res.status} ${body}`);
    }

    const payload = await res.json();
    shaCache[filename] = payload.sha;
    const text = decodeBase64Utf8(payload.content);
    return JSON.parse(text);
  }

  async function writeToGitHub(filename, data, config, message) {
    const content = JSON.stringify(data, null, 2) + "\n";
    const body = {
      message: message || `Update ${filename} via Ohm My God`,
      content: encodeBase64Utf8(content),
      branch: config.githubBranch
    };

    if (shaCache[filename]) {
      body.sha = shaCache[filename];
    }

    const res = await fetch(githubApiUrl(filename, config), {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.githubToken}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify(body)
    });

    if (res.status === 409) {
      await readFromGitHub(filename, config);
      return writeToGitHub(filename, data, config, message);
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`GitHub write failed for ${filename}: ${res.status} ${errBody}`);
    }

    const payload = await res.json();
    shaCache[filename] = payload.content?.sha ?? payload.commit?.sha ?? shaCache[filename];
    return data;
  }

  function openIndexedDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveDirHandle(handle) {
    const db = await openIndexedDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(handle, DIR_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function loadDirHandle() {
    const db = await openIndexedDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(DIR_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  }

  async function ensureDirPermission(handle) {
    const opts = { mode: "readwrite" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
    return false;
  }

  let cachedDirHandle = null;

  async function getDirHandle() {
    if (cachedDirHandle) return cachedDirHandle;
    cachedDirHandle = await loadDirHandle();
    return cachedDirHandle;
  }

  async function pickDataDirectory() {
    if (typeof showDirectoryPicker === "undefined") {
      throw new Error("File System Access API is not supported in this browser. Use Chrome.");
    }
    const handle = await showDirectoryPicker({ mode: "readwrite" });
    const granted = await ensureDirPermission(handle);
    if (!granted) {
      throw new Error("Folder access was denied.");
    }
    await saveDirHandle(handle);
    cachedDirHandle = handle;
    return handle;
  }

  async function readFromFilesystem(filename) {
    const dir = await getDirHandle();
    if (!dir) {
      throw new Error("No data folder selected. Grant folder access in Settings.");
    }
    const granted = await ensureDirPermission(dir);
    if (!granted) {
      throw new Error("Folder permission expired. Re-grant access in Settings.");
    }

    try {
      const fileHandle = await dir.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (err) {
      if (err.name === "NotFoundError" && ARRAY_FILES.has(filename)) {
        return [];
      }
      throw err;
    }
  }

  async function writeToFilesystem(filename, data) {
    const dir = await getDirHandle();
    if (!dir) {
      throw new Error("No data folder selected. Grant folder access in Settings.");
    }
    const granted = await ensureDirPermission(dir);
    if (!granted) {
      throw new Error("Folder permission expired. Re-grant access in Settings.");
    }

    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    const content = JSON.stringify(data, null, 2) + "\n";
    await writable.write(content);
    await writable.close();
    return data;
  }

  async function read(filename) {
    const config = getConfig();
    if (config.mode === "github" && canWrite()) {
      return readFromGitHub(filename, config);
    }
    if (config.mode === "filesystem") {
      const dir = await getDirHandle();
      if (dir) return readFromFilesystem(filename);
    }
    return loadJsonViaFetch(filename);
  }

  async function write(filename, data, message) {
    if (!canWrite()) {
      throw new Error("Writes are not available. Configure GitHub or shared-folder storage in Settings.");
    }

    const config = getConfig();
    if (config.mode === "github") {
      return writeToGitHub(filename, data, config, message);
    }
    if (config.mode === "filesystem") {
      return writeToFilesystem(filename, data);
    }
    throw new Error("Current storage mode does not support writes.");
  }

  async function append(filename, item, message) {
    const current = await read(filename);
    if (!Array.isArray(current)) {
      throw new Error(`${filename} is not an array file`);
    }
    current.push(item);
    return write(filename, current, message);
  }

  async function loadAll() {
    const results = await Promise.all(DATA_FILES.map((file) => read(file)));
    return {
      tree: results[0],
      cases: results[1],
      pending: results[2],
      changelog: results[3]
    };
  }

  async function testGitHubConnection() {
    const config = getConfig();
    if (!config.githubToken || !config.githubOwner || !config.githubRepo) {
      throw new Error("Owner, repo, and token are required.");
    }
    await readFromGitHub("tree.json", config);
    return true;
  }

  async function reloadFromSource() {
    DATA_FILES.forEach((f) => {
      delete shaCache[f];
    });
    return loadAll();
  }

  global.OhmgStorage = {
    DATA_FILES,
    ARRAY_FILES,
    CONFIG_KEYS,
    getConfig,
    saveConfig,
    prepare,
    canWrite,
    getStatus,
    read,
    write,
    append,
    loadAll,
    reloadFromSource,
    testGitHubConnection,
    pickDataDirectory,
    getDirHandle,
    ensureDirPermission
  };
})(window);
