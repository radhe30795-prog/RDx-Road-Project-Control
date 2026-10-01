import React, { useEffect, useState } from "react";
import { Download, X, Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function MobileInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone) {
      setIsInstalled(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // If dismissed previously in this session
    const dismissed = sessionStorage.getItem("rdx_install_dismissed");
    if (!dismissed && isIosDevice) {
      setShowPrompt(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      alert("To install this ERP app on your phone:\n1. Tap your browser's menu (⋮)\n2. Select 'Install app' or 'Add to Home screen'");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("rdx_install_dismissed", "true");
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 text-xs shadow-md border-b border-amber-600 flex items-center justify-between gap-3 sticky top-16 z-30 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 font-black flex items-center justify-center shrink-0 shadow-inner text-xs">
          RD
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate text-[13px] leading-tight">Install RDx ERP on your Phone</p>
          <p className="text-[11px] text-slate-900/80 truncate hidden sm:block">
            Fast access directly from your Home Screen with offline caching
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-md hover:bg-amber-600/20 text-slate-900"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-slate-900 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-500" /> Install on iPhone / iPad
              </h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs space-y-2 text-slate-600 list-decimal list-inside">
              <li>Open this page in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> button at the bottom (box with arrow).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
