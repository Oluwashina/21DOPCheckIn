export const INSTALL_TOUR_DISMISS_KEY = "21dop:install-tour:v1";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform =
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"
  | "android-chrome"
  | "android-samsung"
  | "android-firefox"
  | "android-other"
  | "desktop-chrome"
  | "desktop-edge"
  | "desktop-safari"
  | "desktop-firefox"
  | "other";

export interface InstallGuide {
  browserLabel: string;
  steps: string[];
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function isInstallTourDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(window.localStorage.getItem(INSTALL_TOUR_DISMISS_KEY));
}

export function dismissInstallTour(): void {
  window.localStorage.setItem(INSTALL_TOUR_DISMISS_KEY, "1");
}

export function clearInstallTourDismiss(): void {
  window.localStorage.removeItem(INSTALL_TOUR_DISMISS_KEY);
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);

  if (ios) {
    if (/CriOS/.test(ua)) return "ios-chrome";
    if (/FxiOS|EdgiOS/.test(ua)) return "ios-other";
    if (/Safari/.test(ua)) return "ios-safari";
    return "ios-other";
  }

  if (android) {
    if (/SamsungBrowser/.test(ua)) return "android-samsung";
    if (/Firefox/.test(ua)) return "android-firefox";
    if (/Chrome/.test(ua)) return "android-chrome";
    return "android-other";
  }

  if (/Edg/.test(ua)) return "desktop-edge";
  if (/Chrome/.test(ua)) return "desktop-chrome";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "desktop-safari";
  if (/Firefox/.test(ua)) return "desktop-firefox";
  return "other";
}

export function getInstallGuide(platform: InstallPlatform): InstallGuide {
  switch (platform) {
    case "ios-safari":
      return {
        browserLabel: "Safari on iPhone or iPad",
        steps: [
          "Tap Share at the bottom of the screen. Look for the square with an arrow pointing up.",
          "Scroll the menu and tap Add to Home Screen.",
          "Tap Add in the top corner. The app icon appears on your home screen.",
        ],
      };
    case "ios-chrome":
      return {
        browserLabel: "Chrome on iPhone or iPad",
        steps: [
          "Tap Share at the top or bottom of the screen.",
          "Tap Add to Home Screen.",
          "Tap Add to confirm. You're ready for one-tap check-ins.",
        ],
      };
    case "ios-other":
      return {
        browserLabel: "Your browser on iPhone or iPad",
        steps: [
          "Open this page in Safari if you can. It has the clearest Add to Home Screen option.",
          "Tap Share, then Add to Home Screen.",
          "Confirm with Add.",
        ],
      };
    case "android-chrome":
      return {
        browserLabel: "Chrome on Android",
        steps: [
          "Tap Install below if you see it. That's the fastest way.",
          "Otherwise tap the menu (⋮) at the top right.",
          "Tap Install app or Add to Home screen.",
        ],
      };
    case "android-samsung":
      return {
        browserLabel: "Samsung Internet",
        steps: [
          "Tap the menu (☰ or ⋮) at the bottom or top of the screen.",
          "Tap Add page to, then Home screen.",
          "Confirm. The icon is saved to your home screen.",
        ],
      };
    case "android-firefox":
      return {
        browserLabel: "Firefox on Android",
        steps: [
          "Tap the menu (⋮) at the top right.",
          "Tap Install or Add to Home screen.",
          "Confirm when prompted.",
        ],
      };
    case "android-other":
      return {
        browserLabel: "Your browser on Android",
        steps: [
          "Open the browser menu, usually ⋮ or ☰.",
          "Look for Install app or Add to Home screen.",
          "Confirm. No Play Store download needed.",
        ],
      };
    case "desktop-chrome":
      return {
        browserLabel: "Chrome on computer",
        steps: [
          "Look for the install icon in the address bar: a monitor with a down arrow, or a plus.",
          "Or open the menu (⋮) → Install 21 Days of Power.",
          "Click Install. It opens in its own window like an app.",
        ],
      };
    case "desktop-edge":
      return {
        browserLabel: "Microsoft Edge",
        steps: [
          "Click the app icon in the address bar, or open the menu (⋯).",
          "Choose Apps → Install this site as an app.",
          "Confirm Install.",
        ],
      };
    case "desktop-safari":
      return {
        browserLabel: "Safari on Mac",
        steps: [
          "In the menu bar, click File → Add to Dock.",
          "Or on iPhone/iPad Safari, use Share → Add to Home Screen.",
          "Launch from the Dock or home screen next time.",
        ],
      };
    case "desktop-firefox":
      return {
        browserLabel: "Firefox",
        steps: [
          "Firefox doesn't install web apps the same way. Bookmark this page for quick access.",
          "On your phone, use Chrome or Safari and Add to Home screen instead.",
          "Or pin this tab in your browser for one-click return.",
        ],
      };
    default:
      return {
        browserLabel: "Your browser",
        steps: [
          "Open the browser menu.",
          "Look for Install app, Add to Home screen, or Add to Dock.",
          "Confirm. You'll open the check-in app in one tap next time.",
        ],
      };
  }
}
