export function detectBrowser() {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("edg")) return "edge";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";

  return "unknown";
}

export const EXTENSION_URLS: Record<string, string> = {
  chrome: "https://chrome.google.com/webstore/search/nostr",
  edge: "https://microsoftedge.microsoft.com/addons/",
  firefox: "https://addons.mozilla.org/",
};
