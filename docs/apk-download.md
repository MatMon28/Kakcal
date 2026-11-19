# Making the "Download APK" button work

> **Scope:** how to put a built APK on the website so the install guide's **Download APK** button really downloads it (GitHub Pages deployment).
>
> **Read when:** the button says *"The APK is not attached to this deployment yet"*, or you released a new APK.
>
> **Related:** [android-apk.md](android-apk.md) (building the APK), [pwa-setup.md](pwa-setup.md) (hosting), [../android/BUILD_APK.md](../android/BUILD_APK.md) (signing)

## 1. How the button works (and why it fails today)

`src/components/common/InstallGuide.tsx` has `const APK_URL = './downloads/Kakcalculator.apk'`. When you press **Download APK** it:

1. sends a `HEAD` request to that URL (relative to the site, so `https://matmon28.github.io/Kakcalculator/downloads/Kakcalculator.apk`);
2. if the answer is OK **and** is not `text/html`, it navigates to the URL and the browser downloads the file;
3. otherwise it shows the "not attached to this deployment yet" message and the *Official GitHub releases* link.

So the only requirement is: **after `npm run build`, the file `dist/downloads/Kakcalculator.apk` must exist.** Vite copies everything in `public/` to `dist/`, so the file has to be at `public/downloads/Kakcalculator.apk` when GitHub Actions builds the site.

Two things stop that from happening by default:

- `.gitignore` contains `*.apk`, so the APK is never committed (intentional: it protects you from committing keys/builds by accident).
- `.github/workflows/pages.yml` only runs `npm ci && npm run build`; it never adds an APK.

At the time of writing the live URL returns **404** and the repository has **no GitHub release** yet, so the button can only show its fallback message.

## 2. Build the APK first

Follow [../android/BUILD_APK.md](../android/BUILD_APK.md):

```sh
npm ci
node scripts/prepare-android.mjs      # NOT plain "npm run build": this makes the clean Android bundle
# then in Android Studio: Build > Generate Signed App Bundle / APK > APK > release
```

- **Use a signed release APK** for anything you publish. An unsigned APK cannot be installed. A debug APK (`./gradlew assembleDebug` in `android/`, output `android/app/build/outputs/apk/debug/app-debug.apk`) installs fine for testing but is not a production identity.
- **Keep the same keystore forever.** Android only installs an update over an existing app when it is signed with the same key. Back the keystore up outside git.
- **Raise `versionCode`** (and `versionName`) in `android/app/build.gradle` for every new APK, otherwise Android refuses to update.
- Rename the result to exactly **`Kakcalculator.apk`** (capital K, lowercase rest). The name is case-sensitive on GitHub Pages.

> Do **not** run a plain `npm run build` after `prepare-android.mjs` and then build the APK: it overwrites the prepared Android assets.

## 3. Option A: commit the APK (simplest)

Good for a first test or a small APK. Every new APK stays in the git history forever, so the repository grows with each release, and GitHub blocks single files over 100 MB (it warns above 50 MB).

```sh
mkdir -p public/downloads
cp /path/to/your-signed.apk public/downloads/Kakcalculator.apk
git add -f public/downloads/Kakcalculator.apk     # -f is required because *.apk is git-ignored
git commit -m "Add Kakcalculator.apk"
git push
```

The push to `main` triggers the **Deploy PWA** workflow; a minute or two later the button works. Alternatively add the line `!public/downloads/Kakcalculator.apk` below `*.apk` in `.gitignore`, then a plain `git add` works.

## 4. Option B: GitHub Release + workflow step (recommended)

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
       mkdir -p public/downloads
       if [ ! -f public/downloads/Kakcalculator.apk ]; then
         gh release download --repo "$GITHUB_REPOSITORY" --pattern 'Kakcalculator.apk' --dir public/downloads \
           || echo "No APK in the latest release; the button will show its fallback."
       fi
   ```

   The existing `permissions: contents: read` is enough for a public repository. The step never fails the deployment: with no release, the site simply keeps the fallback message.

**For every new APK**

1. GitHub > **Releases** > **Draft a new release**, choose a new tag (e.g. `v1.1.1`), write a short note.
2. Drag the signed file in as an asset named exactly **`Kakcalculator.apk`**.
3. Press **Publish release**. The workflow runs, downloads the asset, builds the site and deploys it.

The *Official GitHub releases* link in the guide (`/releases/latest`) then shows the same file.

## 5. Check that it worked

```sh
curl -I https://matmon28.github.io/Kakcalculator/downloads/Kakcalculator.apk
```

You want `HTTP/2 200` and a `content-type` that is **not** `text/html` (GitHub Pages normally sends `application/vnd.android.package-archive`). A `404` means the file did not reach `dist/`. Also open the **Actions** tab and check that the latest *Deploy PWA* run is green. Then, on an Android phone, open the site, **Install** > **Android** > **Download APK**.

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Guide says "not attached to this deployment yet" | The URL still returns 404/HTML. Wait for the Actions run, check the file name (`Kakcalculator.apk`, case-sensitive) and the folder (`public/downloads/`). |
| 404 after Option A although you pushed | The file was ignored: `git ls-files public/downloads` must list it. Use `git add -f`. |
| Option B step prints "No APK in the latest release" | The release is a *draft* or *pre-release*, or the asset name is different. Publish it and rename the asset. |
| Old APK still downloads | GitHub Pages and browsers cache for a few minutes. Retry in a private tab; the button already sends `cache: no-store` for its check. |
| "App not installed" on the phone | Unsigned APK, a different signing key than the installed app, or a `versionCode` that is not higher. Uninstall (export a backup in Settings first) or fix signing. |
| "This app could be dangerous" / "unknown source" | Normal for APKs outside Google Play; the guide already explains it. |
| Works online but not in `npm run dev` | Vite answers unknown paths with `index.html` (`text/html`), which the button treats as "missing". Test on the deployed site or with `npm run build && npx vite preview`. |
| Another host (Netlify, Cloudflare) | Same rule: the file must be in `dist/downloads/` after the build. Copy it into `public/downloads/` in that host's build command. |

## 7. Do not publish by accident

Never commit `*.jks`/`*.keystore` or passwords. The optional Android Studio ZIP made by `scripts/package-android.py` is a different file (`Kakcalculator-Android-Studio.zip`) and is not used by the button.
