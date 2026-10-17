import { Capacitor } from "@capacitor/core";

export function navigateTo(path: string, replace = false): void {
  const url = new URL(path, window.location.href);

  if (
    Capacitor.isNativePlatform() &&
    url.origin === window.location.origin &&
    url.pathname !== "/" &&
    !url.pathname.endsWith("index.html")
  ) {
    const directoryPath = url.pathname.endsWith("/")
      ? url.pathname
      : `${url.pathname}/`;
    url.pathname = `${directoryPath}index.html`;
  }

  const target = `${url.pathname}${url.search}${url.hash}`;
  window.dispatchEvent(new Event("devtask:cache-current-page"));
  if (replace) {
    window.location.replace(target);
  } else {
    window.location.assign(target);
  }
}
