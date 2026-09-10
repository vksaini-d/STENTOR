import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  Wifi,
  Radio,
  Smartphone,
  ChevronDown,
} from 'lucide-react';

export interface NetworkIpInfo {
  name: string;
  address: string;
  label: string;
  type: string;
  isHotspot: boolean;
  isRouter: boolean;
}

interface ClassroomQrModalProps {
  roomCode: string;
  arch: 'arch1' | 'arch2' | 'arch3' | 'arch4';
  isOpen: boolean;
  onClose: () => void;
}

export function ClassroomQrModal({
  roomCode,
  arch,
  isOpen,
  onClose,
}: ClassroomQrModalProps) {
  const [networkIps, setNetworkIps] = useState<NetworkIpInfo[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showIpDropdown, setShowIpDropdown] = useState(false);

  // Fetch available network adapters from server
  useEffect(() => {
    let isMounted = true;
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const ips: NetworkIpInfo[] = data.ips || [];
        setNetworkIps(ips);

        // Smart IP default based on active architecture
        const browserHost = window.location.hostname;
        let chosenIp = browserHost;

        if (arch === 'arch1' || arch === 'arch2') {
          // Hotspot architecture: prefer 192.168.137.x or 192.168.43.x
          const hotspot = ips.find((ip) => ip.isHotspot || ip.address.startsWith('192.168.137.') || ip.address.startsWith('192.168.43.'));
          if (hotspot) chosenIp = hotspot.address;
        } else if (arch === 'arch3') {
          // Router architecture: prefer 192.168.0.x or 192.168.1.x
          const router = ips.find((ip) => ip.isRouter || ip.address.startsWith('192.168.0.') || ip.address.startsWith('192.168.1.'));
          if (router) chosenIp = router.address;
        } else if (ips.length > 0 && browserHost === 'localhost') {
          chosenIp = ips[0].address;
        }

        setSelectedIp(chosenIp);
      })
      .catch(() => {
        if (!isMounted) return;
        setSelectedIp(window.location.hostname);
      });

    return () => {
      isMounted = false;
    };
  }, [arch]);

  // Construct target student URL
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;
  const targetHost = selectedIp || window.location.hostname;
  const studentJoinUrl = `${protocol}//${targetHost}${port}/?arch=${arch}&role=student&room=${encodeURIComponent(roomCode)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(studentJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const archLabels: Record<string, string> = {
    arch1: '🔥 Arch 1: Phone Hotspot Lite',
    arch2: '⚡ Arch 2: Laptop Hotspot + LiveKit',
    arch3: '📡 Arch 3: Dedicated Router + LiveKit',
    arch4: '🎙️ Arch 4: Custom WebSocket PCM',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className={`bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isFullScreen
              ? 'w-full h-full max-w-none max-h-none rounded-none p-6 justify-between'
              : 'w-full max-w-md p-6'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand/15 text-brand rounded-xl">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-snug">
                  Classroom QR Code
                </h3>
                <p className="text-xs text-brand font-medium">
                  {archLabels[arch] || 'ClassCast Studio'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                title={isFullScreen ? 'Exit Full Screen' : 'Projector / Full Screen Mode'}
              >
                {isFullScreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="py-5 flex flex-col items-center justify-center gap-5">
            {/* Network IP Selector */}
            <div className="w-full relative">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Broadcast IP / Network:</span>
                <span className="text-[10px] text-brand">Auto-Configured</span>
              </label>
              <button
                type="button"
                onClick={() => setShowIpDropdown(!showIpDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 border border-slate-700 hover:border-brand/50 rounded-xl text-xs font-mono text-slate-200 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Wifi className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="font-semibold text-white">{targetHost}</span>
                  <span className="text-slate-400 text-[11px]">
                    (
                    {networkIps.find((i) => i.address === targetHost)?.label ||
                      'Current Host'}
                    )
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>

              {/* Dropdown for multiple network adapters */}
              {showIpDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-48 overflow-y-auto">
                  {networkIps.map((net) => (
                    <button
                      key={net.address}
                      onClick={() => {
                        setSelectedIp(net.address);
                        setShowIpDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition ${
                        selectedIp === net.address
                          ? 'bg-brand/10 text-brand font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="font-mono">{net.address}</span>
                      <span className="text-[11px] text-slate-400">{net.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedIp(window.location.hostname);
                      setShowIpDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 text-slate-300 border-t border-slate-700/50"
                  >
                    <span className="font-mono">{window.location.hostname}</span>
                    <span className="text-[11px] text-slate-400">Browser Hostname</span>
                  </button>
                </div>
              )}
            </div>

            {/* QR Code Canvas */}
            <div className="relative group">
              <div
                className={`bg-white p-4 rounded-3xl shadow-2xl border-4 border-brand/40 flex items-center justify-center transition-all ${
                  isFullScreen ? 'scale-110' : ''
                }`}
              >
                <QRCodeSVG
                  value={studentJoinUrl}
                  size={isFullScreen ? 320 : 210}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2 text-center">
              <span className="text-xs text-slate-400">Room Code:</span>
              <span className="px-3 py-1 bg-slate-800 border border-brand/30 rounded-xl font-mono font-bold text-sm text-brand tracking-wider">
                {roomCode}
              </span>
            </div>

            {/* Instructions */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3.5 w-full text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-brand" />
                Student Instructions:
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
                <li>Connect to Teacher's Wi-Fi / Hotspot.</li>
                <li>Open Camera app & point at this QR code.</li>
                <li>Tap the link & plug in earphones to listen!</li>
              </ol>
            </div>

            {/* URL Display & Copy Button */}
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-400 truncate select-all">
                {studentJoinUrl}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand/90 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-brand animate-pulse" />
              Dynamic Direct-Join Active
            </span>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white px-3 py-1 rounded-lg hover:bg-slate-800 transition font-medium"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
//  Inline Card Badge for Teacher Views
// ─────────────────────────────────────────────
interface ClassroomQrBadgeProps {
  roomCode: string;
  arch: 'arch1' | 'arch2' | 'arch3' | 'arch4';
  onOpenModal: () => void;
}

export function ClassroomQrBadge({
  roomCode,
  arch,
  onOpenModal,
}: ClassroomQrBadgeProps) {
  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand/15 text-brand rounded-xl shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            Student Join QR Code
            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">
              {roomCode}
            </span>
            <span className="text-[9px] uppercase font-bold text-brand bg-brand/10 border border-brand/20 px-1 rounded">
              {arch}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Directs students to {arch.toUpperCase()} & room
          </p>
        </div>
      </div>
      <button
        onClick={onOpenModal}
        className="flex items-center gap-1 px-3 py-1.5 bg-brand/20 hover:bg-brand/30 text-brand border border-brand/40 font-semibold text-xs rounded-xl transition shrink-0 cursor-pointer"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        Show QR
      </button>
    </div>
  );
}
