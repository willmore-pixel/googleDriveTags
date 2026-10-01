# Drive Tags

Tag your Google Drive files and find them in seconds, on your phone or computer.

Drive Tags is a small Google Apps Script web app. You add tags like `vintage`, `gucci` or `dress` to files in your Google Drive, group tags into categories, and search by any combination of tags. It was made for a sewing community to organise patterns, fabric photos and garment references, but it works for any kind of file.

<!-- Add a screenshot: save it in the repo as screenshot.png and remove the comment marks below -->
[Drive Tags screenshot](screenshot.png)

## Features

- **Tags on any Drive file**: Docs, Sheets, PDFs, photos, videos and more.
- **Categories**: group tags (for example *Brand*: gucci, chanel; *Garment type*: top, dress, skirt). Tags in the same category share a colour.
- **Smart filtering**: pick tags to filter. Tags in the same category match either one (gucci **or** chanel); tags in different categories must all match (gucci **and** dress).
- **Search**: type several words (`vintage top`) to find files where every word matches a tag or the file name. When tags are selected, the search looks only inside those files.
- **Large thumbnails** next to each file.
- **Works on phone and computer**: add it to your home screen and it opens like an app. Tags sync automatically.
- **Private and read-only**: only you can see your files and tags, and the app cannot change or delete anything in your Drive.

## How it works

Drive Tags runs as your own copy of a Google Apps Script project, inside your own Google account. There is no server, database or third party involved.

- Tags and categories are saved in the script's private [User Properties](https://developers.google.com/apps-script/guides/properties) storage. They are not written into your files, don't appear in Drive, and don't use your Drive storage.
- Tags are linked to each file's Drive ID, so renaming or moving a file keeps its tags. Copies and re-uploaded files count as new files.
- The app asks for two permissions: **see and download your Google Drive files** (`drive.readonly`) and **see your email address** (`userinfo.email`, used to show which account is signed in).

## Install

You need a Google account and a computer for setup (about 10 minutes). After that, it also works on your phone.

### 1. Create the project

1. Go to [script.google.com](https://script.google.com) and click **New project**. Rename it to **Drive Tags**.
2. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this repo.
3. Click **+** next to *Files* → **HTML**, name it `Index`, and replace its contents with [`Index.html`](Index.html).
4. Click the gear icon (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**. Back in the editor, replace the contents of `appsscript.json` with [`appsscript.json`](appsscript.json).
5. Click **Save**.

### 2. Deploy

1. Click **Deploy** → **New deployment**, click the gear icon next to *Select type*, and choose **Web app**.
2. Set **Execute as: Me** and **Who has access: Only myself**.
3. Click **Deploy**, then **Authorize access**.
4. Google will warn that it **hasn't verified this app**. This is normal for personal scripts. Click **Advanced** → **Go to Drive Tags (unsafe)** → **Allow**.
5. Copy the **Web app URL**. That's your Drive Tags link.

### 3. Use it on your phone

Open the link on your phone and sign in with the same Google account.

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ → **Add to Home screen**

## Updating to a new version

Update your existing project rather than creating a new one. A new project starts with empty tags.

1. Replace the contents of `Code.gs`, `Index` and `appsscript.json` with the latest versions from this repo, and click **Save**.
2. Go to **Deploy** → **Manage deployments**, click the pencil icon, set **Version** to **New version**, and click **Deploy**.

Your link, home-screen shortcut, tags and categories all stay the same.

## Using it

| To | Do this |
| --- | --- |
| Tag a file | **Files** tab → **Add tags** → type a tag, optionally pick a category → **Add** → **Save tags** |
| Create categories | **Tags** tab → **Categories** → add a category, then choose a category for each tag |
| Filter by tags | **Tags** tab → tap one or more tags → **Show files**, or tap a tag on any file |
| Search | Type in the search box. Several words must all match. |
| Open a file | Tap its thumbnail or name |

## FAQ

**Can anyone else see my files or tags?**
No. Each person runs their own copy, and your data stays in your Google account.

**I have several Google accounts.**
Each copy works with the account that deployed it. To use another account, set up a separate copy with that account. If the app opens with the wrong account, use a private/incognito window signed in to only the account you want, or a separate Chrome profile.

**How do I remove the app's access?**
Tap the round account button in the app → **Remove app access**, or go to [myaccount.google.com/connections](https://myaccount.google.com/connections).

**What happens if I delete the Apps Script project?**
Your tags and categories are deleted with it. Your Drive files are not affected.

## Limits

- Search results show up to 40 files at a time.
- Tags are limited to 20 per file, and the storage holds tags for several thousand files.
- Google Apps Script quotas apply. They are generous for personal use.

## License

See [LICENSE](LICENSE).
