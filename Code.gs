/**
 * Drive Tags — a personal tagging app for Google Drive.
 * Tags are saved privately in your Google account (User Properties),
 * so they sync across your phone and computer.
 */

const MAX_RESULTS = 40;
const PREFIX = 't:';      // t:<fileId>  -> ["tag", ...]
const CAT_PREFIX = 'c:';  // c:<tag>     -> "Category"
const CAT_LIST = 'cats';  // cats        -> ["Brand", "Garment type", ...]
const STARS = 'stars';    // stars       -> ["fileId", ...]

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Drive Tags')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ---------- storage helpers ---------- */

function store_() {
  return PropertiesService.getUserProperties();
}

function readAll_() {
  const all = store_().getProperties();
  const map = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(PREFIX) === 0) {
      try { map[k.slice(PREFIX.length)] = JSON.parse(all[k]); } catch (e) {}
    }
  });
  return map;
}

function readStars_() {
  try { return JSON.parse(store_().getProperty(STARS) || '[]'); } catch (e) { return []; }
}

function cleanTags_(tags) {
  const seen = {};
  return (tags || [])
    .map(function (t) {
      return String(t).trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, ' ');
    })
    .filter(function (t) {
      if (!t || seen[t]) return false;
      seen[t] = true;
      return true;
    })
    .slice(0, 20);
}

/* ---------- file helpers ---------- */

function niceType_(mime) {
  if (mime === 'application/vnd.google-apps.document') return 'Doc';
  if (mime === 'application/vnd.google-apps.spreadsheet') return 'Sheet';
  if (mime === 'application/vnd.google-apps.presentation') return 'Slides';
  if (mime === 'application/vnd.google-apps.form') return 'Form';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.indexOf('image/') === 0) return 'Image';
  if (mime.indexOf('video/') === 0) return 'Video';
  if (mime.indexOf('audio/') === 0) return 'Audio';
  if (mime.indexOf('word') !== -1) return 'Word';
  if (mime.indexOf('sheet') !== -1 || mime.indexOf('excel') !== -1) return 'Excel';
  return 'File';
}

function fileInfo_(file, tags, stars) {
  return {
    starred: !!(stars && stars.indexOf(file.getId()) !== -1),
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    type: niceType_(file.getMimeType()),
    modified: file.getLastUpdated().getTime(),
    tags: tags || []
  };
}

function tryGet_(id) {
  try {
    const f = DriveApp.getFileById(id);
    return f.isTrashed() ? null : f;
  } catch (e) {
    return null;
  }
}

/* ---------- functions called from the app ---------- */

/**
 * Search files.
 *  text        words typed in the search box; every word must match the file name or a tag
 *              ("vintage top", "vintage+top" and "vintage, top" all work)
 *  include     tags to filter by (same category = either one, different categories = all)
 *  exclude     hide files that have ANY of these tags
 *  starredOnly only starred files
 * With nothing at all: files changed in the last 30 days.
 */
function searchFiles(text, include, exclude, starredOnly) {
  include = include || [];
  exclude = exclude || [];
  const map = readAll_();
  const stars = readStars_();
  const words = (text || '').toLowerCase().split(/[\s,+]+/)
    .map(function (w) { return w.replace(/^#+/, ''); })
    .filter(Boolean);

  const tagsOf = function (id) { return map[id] || []; };
  const inTags = function (tags, w) { return tags.some(function (t) { return t.indexOf(w) !== -1; }); };
  const wordsOk = function (name, tags) {
    name = name.toLowerCase();
    return words.every(function (w) { return name.indexOf(w) !== -1 || inTags(tags, w); });
  };
  const notExcluded = function (id) {
    return !tagsOf(id).some(function (t) { return exclude.indexOf(t) !== -1; });
  };

  const out = [];

  // Tag filter or starred: look only at those files.
  if (include.length || starredOnly) {
    const match = includeMatcher_(include);
    let ids = include.length ? Object.keys(map).filter(function (id) { return match(map[id]); }) : stars.slice();
    if (starredOnly) ids = ids.filter(function (id) { return stars.indexOf(id) !== -1; });
    ids.filter(notExcluded).forEach(function (id) {
      const f = tryGet_(id);
      if (f && wordsOk(f.getName(), tagsOf(id))) out.push(fileInfo_(f, map[id], stars));
    });
    out.sort(function (a, b) { return b.modified - a.modified; });
    return out;
  }

  // Otherwise search the whole Drive by name...
  let q;
  if (words.length) {
    q = words.map(function (w) {
      return "title contains '" + w.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }).join(' and ') + ' and trashed = false';
  } else {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    q = "modifiedDate > '" + since + "' and trashed = false";
  }
  const have = {};
  const it = DriveApp.searchFiles(q);
  while (it.hasNext() && out.length < MAX_RESULTS) {
    const f = it.next();
    have[f.getId()] = true;
    if (notExcluded(f.getId())) out.push(fileInfo_(f, map[f.getId()], stars));
  }

  // ...plus tagged files whose tags match the words.
  if (words.length) {
    Object.keys(map).forEach(function (id) {
      if (have[id] || !notExcluded(id)) return;
      if (!words.some(function (w) { return inTags(map[id], w); })) return;
      const f = tryGet_(id);
      if (f && wordsOk(f.getName(), map[id])) out.push(fileInfo_(f, map[id], stars));
    });
  }

  out.sort(function (a, b) { return b.modified - a.modified; });
  return out;
}

/**
 * Returns a test for a file's tag list. Tags in the SAME category match either one
 * (gucci OR chanel); different categories must all match (gucci AND dress).
 * Tags with no category must each match.
 */
function includeMatcher_(tags) {
  const tagCat = getCategories().tagCat;
  const groups = {};
  tags.forEach(function (t) {
    const g = tagCat[t] ? 'cat:' + tagCat[t] : 'tag:' + t;
    (groups[g] = groups[g] || []).push(t);
  });
  return function (fileTags) {
    return Object.keys(groups).every(function (g) {
      return groups[g].some(function (t) { return fileTags.indexOf(t) !== -1; });
    });
  };
}

/** Star or unstar a file. */
function setStar(id, on) {
  const stars = readStars_().filter(function (x) { return x !== id; });
  if (on) stars.push(id);
  store_().setProperty(STARS, JSON.stringify(stars));
  return on;
}

/**
 * Replace a file's tags. Returns the cleaned list.
 * newCats (optional) = {tag: category} for tags just created in the editor.
 */
function setTags(id, tags, newCats) {
  const clean = cleanTags_(tags);
  const key = PREFIX + id;
  if (clean.length) store_().setProperty(key, JSON.stringify(clean));
  else store_().deleteProperty(key);
  if (newCats) {
    const list = getCategories().list;
    clean.forEach(function (t) {
      if (newCats[t] && list.indexOf(newCats[t]) !== -1) store_().setProperty(CAT_PREFIX + t, newCats[t]);
    });
  }
  return clean;
}

/* ---------- categories ---------- */

/** {list: ["Brand", ...], tagCat: {gucci: "Brand", ...}} */
function getCategories() {
  const all = store_().getProperties();
  let list = [];
  try { list = JSON.parse(all[CAT_LIST] || '[]'); } catch (e) {}
  const tagCat = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(CAT_PREFIX) === 0 && list.indexOf(all[k]) !== -1) tagCat[k.slice(CAT_PREFIX.length)] = all[k];
  });
  return { list: list, tagCat: tagCat };
}

/** Save the category names (in order). Tags in a removed category go back to "Other". */
function saveCategoryList(names) {
  const seen = {};
  const list = (names || []).map(function (n) { return String(n).trim().slice(0, 40); })
    .filter(function (n) { if (!n || seen[n]) return false; seen[n] = true; return true; })
    .slice(0, 20);
  store_().setProperty(CAT_LIST, JSON.stringify(list));
  const all = store_().getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(CAT_PREFIX) === 0 && list.indexOf(all[k]) === -1) store_().deleteProperty(k);
  });
  return getCategories();
}

/** Put a tag in a category ('' = no category). */
function setTagCategory(tag, cat) {
  if (cat) store_().setProperty(CAT_PREFIX + tag, cat);
  else store_().deleteProperty(CAT_PREFIX + tag);
  return true;
}

/** All tags with how many files use each. */
function getTagCounts() {
  const map = readAll_();
  const counts = {};
  Object.keys(map).forEach(function (id) {
    map[id].forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
  });
  return Object.keys(counts).sort().map(function (t) {
    return { tag: t, count: counts[t] };
  });
}

/** Files matching these tags (kept for older versions of the page). */
function getFilesByTags(tags) {
  return searchFiles('', tags);
}

/** Thumbnail as an image the app can show directly (used when the quick link fails). */
function getThumbnail(id) {
  try {
    const blob = DriveApp.getFileById(id).getThumbnail();
    if (!blob) return null;
    return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' +
      Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return null;
  }
}

/** Who is signed in, the app's link, and whether they've seen the welcome message. */
function getMe() {
  return {
    email: Session.getActiveUser().getEmail(),
    welcomed: store_().getProperty('welcomed') === '1'
  };
}

function dismissWelcome() {
  store_().setProperty('welcomed', '1');
}
