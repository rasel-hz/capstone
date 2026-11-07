import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';

export const isNative = () => Capacitor.isNativePlatform();
export const isIos = () => Capacitor.getPlatform() === 'ios';

// On the web, API paths are relative to the site. An installed app has no site to be relative to,
// so it calls a server by its full address. The OpenAI key stays on that server, never in the app.
// The default suits a demo over USB, where `adb reverse` connects the phone to this computer.
export const apiUrl = (path: string, native = isNative(), base: string = import.meta.env.VITE_API_BASE ?? '') =>
  (native ? (base || 'http://localhost:8765') : base) + path;

// The most recently opened screen handles the Android back button first.
const handlers: (() => void)[] = [];

export function pressBack(fallback: () => void) {
  const top = handlers[handlers.length - 1];
  if (top) top();
  else fallback();
}

export function addBackHandler(fn: () => void) {
  handlers.push(fn);
  return () => {
    const i = handlers.lastIndexOf(fn);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function useBackHandler(fn: () => void, active = true) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => (active ? addBackHandler(() => latest.current()) : undefined), [active]);
}

// Without a handler, back moves toward Home, then leaves the app in the background. The app has no browser history.
export function listenForBack(fallback: () => boolean) {
  if (!isNative()) return () => {};
  const sub = NativeApp.addListener('backButton', () => {
    pressBack(() => {
      if (!fallback()) void NativeApp.minimizeApp();
    });
  });
  return () => { void sub.then((s) => s.remove()); };
}
