'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after a delay if not installed
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 10000); // Show after 10 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('Pink Poong Piano was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
  };

  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 z-50 max-w-sm"
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full flex items-center justify-center">
                🎹
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Install Pink Poong Piano</h3>
                <p className="text-white/70 text-xs">Add to your home screen</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-white/80 text-sm mb-4 leading-relaxed">
            Get the full experience! Install Pink Poong Piano for faster loading, offline access, and a native app feel.
          </p>

          <div className="flex space-x-2">
            <motion.button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={16} />
              <span>Install</span>
            </motion.button>
            
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 