# Android app

The Android app is the same web app wrapped with [Capacitor](https://capacitorjs.com), so there's one codebase. The project is in `android/`.

## First-time setup
1. Install [Android Studio](https://developer.android.com/studio) with its default options. It includes the Android SDK and the Java version it needs.
2. Run this from the project folder:

```bash
npm install
```

```bash
npm run android
```

3. Android Studio opens the project. Wait for its first Gradle sync to finish, which can take several minutes.
4. Connect a phone with USB debugging on, or create an emulator in **Device Manager**.
5. Press **Run**.

Build from inside Android Studio, because it uses its own Java. The Java already on your PATH may be too new for Android's build tools.

## Commands

| Command | What it does |
|---|---|
| `npm run android` | Builds the web app, copies it into `android/`, and opens Android Studio |
| `npm run android:sync` | Builds and copies only. Run it after changing the app, then press Run again |
| `npm run android:connect` | Connects the phone to this computer's server over USB |

## Using the AI in a demo

The OpenAI key **never goes in the app**, because anyone could extract it from an APK. The app asks a server to make the AI call. For a demo, that server is your computer.

1. Connect the phone by USB, or start the emulator.
2. In one terminal, start the server:

```bash
npm run dev
```

3. In another terminal, connect the phone to it. Run this again if you unplug the phone:

```bash
npm run android:connect
```

If `adb` isn't found, it's in `%LOCALAPPDATA%\Android\Sdk\platform-tools`. Add that folder to your PATH, or restart the terminal after installing Android Studio.

Without this connection, the app still works. The chat uses keyword rules and says so, and the rest of the app works offline.

## Sharing an APK

In Android Studio, choose **Build > Generate App Bundles or APKs > Generate APKs**. The file appears in `android/app/build/outputs/apk/debug/`. Your friend's phone will ask to allow installing from unknown sources.

A shared APK has no server connection, so its chat uses keyword rules unless you've set up a hosted server.

## Using a hosted server

Set the address in `.env` before building, then run `npm run android:sync`:

```bash
VITE_API_BASE=https://your-server.example
```

**Before hosting:** there are no user accounts yet, so anyone who finds the address can spend your key, up to the rate limit. Use a separate key with a low spending limit, and take it down after the demo. A real launch needs authentication first.

## How the app differs from the website

| Area | Website | App |
|---|---|---|
| Server address | Same site | `http://localhost:8765`, or `VITE_API_BASE` |
| Back button | Browser | Closes the top screen, then goes Home, then leaves the app in the background (`services/native.ts`) |

The server allows only the app's own origins (`server/api.ts`), and other websites are still rejected. Unencrypted connections are allowed only to the local demo server (`android/app/src/main/res/xml/network_security_config.xml`). App data is excluded from Android backups, because it can include personal wellbeing notes.

## Known gaps
- **App icon:** still Capacitor's default icon and splash screen. See `docs/HANDOFF.md` for the Masko prompt.
- **Saved data:** it's in the web view's storage, like the website. Clearing the app's data deletes it, and there's no account to restore it from.
- **iPhone:** not set up. It needs a Mac with Xcode. Mascot clips would show as still images there.
- **Google Play:** not attempted. It needs a signed release build and a developer account, and health and wellbeing apps get extra review.
