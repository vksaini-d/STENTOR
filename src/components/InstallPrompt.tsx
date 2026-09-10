import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Web standard BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // If dismissed in this session, check sessionStorage
    const dismissed = sessionStorage.getItem('classcast_install_dismissed');
    if (dismissed) return;

    // Capture Chrome/Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS Safari, show helper banner after 2.5 seconds
    let iosTimer: NodeJS.Timeout;
    if (isIosDevice && !isStandaloneMode) {
      iosTimer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
    }

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('classcast_install_dismissed', 'true');
  };

  if (isStandalone || !showBanner || installed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Install App"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 bg-slate-800/95 backdrop-blur-md border border-brand/30 rounded-2xl shadow-2xl text-slate-100 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Install ClassCast App
                <span className="text-[10px] bg-brand/20 text-brand px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  Offline PWA
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Add to Home Screen for fast 1-tap offline audio streaming with zero browser address bars.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-slate-900/80 rounded-xl p-2.5 text-xs text-slate-300 border border-slate-700/60 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-medium text-amber-400">
              <Share className="w-3.5 h-3.5" />
              <span>How to install on iPhone/iPad:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
              <li>Tap the <strong className="text-white">Share</strong> button (at the bottom of Safari).</li>
              <li>Scroll down and tap <strong className="text-white">Add to Home Screen</strong> (<PlusSquare className="w-3 h-3 inline text-brand" />).</li>
            </ol>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-xs bg-brand hover:bg-brand/90 text-slate-950 font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-brand/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
