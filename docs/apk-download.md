# Making the "Download APK" button work

> **Scope:** how to put a built APK on the website so the install guide's **Download APK** button really downloads it (GitHub Pages deployment).
>
> **Read when:** the button says *"The APK is not attached to this deployment yet"*, or you released a new APK.
>
> **Related:** [android-apk.md](android-apk.md) (building the APK), [pwa-setup.md](pwa-setup.md) (hosting), [../android/BUILD_APK.md](../android/BUILD_APK.md) (signing)

## 1. The file name: always `kakcal.apk`

One fixed name, no version in it: **`public/downloads/kakcal.apk`**. Android identifies an installed app by package id
(`com.kcalsync.app`) plus the signing key, never by the file name, so the name can stay the same for every release and
each new APK simply replaces the previous one on the website. The version lives where it belongs: `versionName` /
`versionCode` in `android/app/build.gradle`, and the release tag (`v1.2.0`).

Only the URL has to match, so it is fixed in exactly one place:

- `src/components/common/InstallGuide.tsx` has `const APK_URL = './downloads/kakcal.apk'`;
- `.github/workflows/pages.yml` fetches **any** `*.apk` asset from the latest release and renames it to
  `public/downloads/kakcal.apk`.

So the asset attached to the release may be called anything (`kakcal.apk`, `Kakcal.apk`, `app-release.apk`, the old
`Kakcalculator.apk`); the workflow publishes it under the one name the page asks for. The button also accepts the old
`Kakcalculator.apk` URL as a second try, so a deployment built before this rename keeps working.

## 2. How the button works

When you press **Download APK** it:

1. sends a `HEAD` request to `./downloads/kakcal.apk` (relative to the site, so
   `https://matmon28.github.io/Kakcalculator/downloads/kakcal.apk`), and to `./downloads/Kakcalculator.apk` if that fails;
2. for the first answer that is OK **and** is not `text/html`, it navigates to that URL and the browser downloads it (saved as `kakcal.apk`);
3. otherwise it shows the "not attached to this deployment yet" message and the *Official GitHub releases* link.

So the only requirement is: **after `npm run build`, the file `dist/downloads/kakcal.apk` must exist.** Vite copies
everything in `public/` to `dist/`, so the file has to be in `public/downloads/` when GitHub Actions builds the site.

Two things stop that from happening by default:

- `.gitignore` contains `*.apk`, so the APK is never committed (intentional: it protects you from committing keys/builds by accident).
- The workflow only downloads an APK that is attached to the **latest release** — with no release there is nothing to fetch.

At the time of writing the live URL returns **404** and the repository has **no GitHub release** yet, so the button can only show its fallback message.

## 3. Build the APK first

Follow [../android/BUILD_APK.md](../android/BUILD_APK.md):

```sh
npm ci
node scripts/prepare-android.mjs      # NOT plain "npm run build": this makes the clean Android bundle
# then in Android Studio: Build > Generate Signed App Bundle / APK > APK > release
```

- **Use a signed release APK** for anything you publish. An unsigned APK cannot be installed. A debug APK (`./gradlew assembleDebug` in `android/`, output `android/app/build/outputs/apk/debug/app-debug.apk`) installs fine for testing but is not a production identity.
- **Keep the same keystore forever.** Android only installs an update over an existing app when it is signed with the same key. Back the keystore up outside git.
- **Raise `versionCode`** (and `versionName`) in `android/app/build.gradle` for every new APK, otherwise Android refuses to update.
- Name the file **`kakcal.apk`** (lowercase). The name is case-sensitive on GitHub Pages. With Option B any name works, the workflow renames it.

> Do **not** run a plain `npm run build` after `prepare-android.mjs` and then build the APK: it overwrites the prepared Android assets.

## 4. Option A: commit the APK (simplest)

Good for a first test or a small APK. Every new APK stays in the git history forever, so the repository grows with each release, and GitHub blocks single files over 100 MB (it warns above 50 MB).

```sh
mkdir -p public/downloads
cp /path/to/your-signed.apk public/downloads/kakcal.apk
git add -f public/downloads/kakcal.apk     # -f is required because *.apk is git-ignored
git commit -m "Add kakcal.apk"
git push
```

The push to `main` triggers the **Deploy PWA** workflow; a minute or two later the button works. Alternatively add the line `!public/downloads/*.apk` below `*.apk` in `.gitignore`, then a plain `git add` works. A new
release replaces the file; the URL doesn't change, so nothing else has to be edited.

## 5. Option B: GitHub Release + workflow step (recommended)

The APK lives in a GitHub Release (not in git history) and the website build downloads it. Updating the APK then never touches the source code.

**One-time setup**

1. In `.github/workflows/pages.yml` change the trigger line so it also runs when you publish a release:

   ```yaml
   on: { push: { branches: [main] }, release: { types: [published] }, workflow_dispatch: {} }
   ```

2. Add this step **before** `- run: npm ci && npm run build`:

   ```yaml
   - name: Fetch the APK from the latest release (optional)
     env: { GH_TOKEN: "${{ github.token }}" }
     run: |
       set -eu
       mkdir -p public/downloads/release
       gh release download --repo "$GITHUB_REPOSITORY" --pattern '*.apk' --dir public/downloads/release \
         || echo "No APK in the latest release; the button will show its fallback."
       apk=$(find public/downloads/release -name '*.apk' -type f 2>/dev/null | sort | tail -n 1)
       [ -n "$apk" ] && mv "$apk" public/downloads/kakcal.apk
       rm -rf public/downloads/release
   ```

   The repository already has this step. The existing `permissions: contents: read` is enough for a public repository.
   The step never fails the deployment: with no release, the site simply keeps the fallback message.

**For every new APK**

1. GitHub > **Releases** > **Draft a new release**, choose a new tag (e.g. `v1.1.1`), write a short note.
2. Drag the signed file in as an asset — **any name** (`kakcal.apk` is the obvious one). Put the version in the tag (`v1.2.0`), not in the file name.
3. Press **Publish release**. The workflow runs, downloads the asset, builds the site and deploys it.

The *Official GitHub releases* link in the guide (`/releases/latest`) then shows the same file.

## 6. Check that it worked

```sh
curl -I https://matmon28.github.io/Kakcalculator/downloads/kakcal.apk
```

You want `HTTP/2 200` and a `content-type` that is **not** `text/html` (GitHub Pages normally sends `application/vnd.android.package-archive`). A `404` means the file did not reach `dist/`. Also open the **Actions** tab and check that the latest *Deploy PWA* run is green. Then, on an Android phone, open the site, **Install** > **Android** > **Download APK**.

## 7. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Guide says "not attached to this deployment yet" | The URL still returns 404/HTML. Wait for the Actions run; check the folder (`public/downloads/`) and that the file is named **`kakcal.apk`** (lowercase, case-sensitive on GitHub Pages). |
| 404 after Option A although you pushed | The file was ignored: `git ls-files public/downloads` must list it. Use `git add -f`. |
| Option B step prints "No APK in the latest release" | The release is a *draft* or *pre-release*, or the asset name is different. Publish it and rename the asset. |
| Old APK still downloads | The name never changes, so a cache can serve the previous build for a few minutes. Retry in a private tab; the button already sends `cache: no-store` for its check. The version on the phone (Settings > About) is the reliable check. |
| "App not installed" on the phone | Unsigned APK, a different signing key than the installed app, or a `versionCode` that is not higher. Uninstall (export a backup in Settings first) or fix signing. |
| "This app could be dangerous" / "unknown source" | Normal for APKs outside Google Play; the guide already explains it. |
| Works online but not in `npm run dev` | Vite answers unknown paths with `index.html` (`text/html`), which the button treats as "missing". Test on the deployed site or with `npm run build && npx vite preview`. |
| Another host (Netlify, Cloudflare) | Same rule: the file must be in `dist/downloads/` after the build. Copy it into `public/downloads/` in that host's build command. |

## 8. Do not publish by accident

Never commit `*.jks`/`*.keystore` or passwords. The optional Android Studio ZIP made by `scripts/package-android.py` is a
different file (`Kakcalculator-Android-Studio.zip`, an internal name kept on purpose — see [brand.md](brand.md)) and is
not used by the button.
