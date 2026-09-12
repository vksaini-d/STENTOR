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
 arch: 'arch1' | 'arch2';
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
  const [qrSize, setQrSize] = useState(210);

  useEffect(() => {
    const updateSize = () => {
      if (isFullScreen) {
        setQrSize(Math.min(320, window.innerWidth - 80));
      } else {
        setQrSize(Math.min(210, window.innerWidth - 120));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullScreen]);

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
    arch1: 'Stentor Voice Relay',
    arch2: 'Stentor High-Fidelity',
  };

 return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto glass-overlay" onClick={onClose}>
          <div className={`min-h-full flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4'}`} onClick={onClose}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
 initial={{ opacity: 0, scale: 0.92 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.92 }}
 className={`bg-[--color-base] border border-[--color-surface] rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${
 isFullScreen
 ? 'w-full h-full max-w-none max-h-none rounded-none p-6 justify-between'
 : 'w-full max-w-md p-6'
 }`}
 >
 {/* Header */}
 <div className="flex items-center justify-between pb-4 border-b border-[--color-surface]">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-[--color-signal]/15 text-[--color-signal] rounded-xl">
 <QrCode className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-[--color-text-primary] text-base leading-snug">
 Classroom QR Code
 </h3>
 <p className="text-xs text-[--color-signal] font-medium">
 {archLabels[arch] || 'Stentor'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setIsFullScreen(!isFullScreen)}
 className="p-2 text-[--color-text-secondary] hover:text-[--color-text-primary] rounded-xl hover:bg-[--color-surface] transition"
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
 className="p-2 text-[--color-text-secondary] hover:text-[--color-text-primary] rounded-xl hover:bg-[--color-surface] transition"
 title="Close"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Body */}
 <div className="py-5 flex flex-col items-center justify-center gap-5">
 {/* Network IP Selector */}
 <div className="w-full relative z-30">
 <label className="text-[11px] font-semibold text-[--color-text-secondary] mb-1.5 flex items-center justify-between">
 <span>Broadcast IP / Network:</span>
 <span className="text-[10px] text-[--color-signal]">Auto-Configured</span>
 </label>
 <button
 type="button"
 onClick={() => setShowIpDropdown(!showIpDropdown)}
 className="w-full flex items-center justify-between px-3 py-2 bg-[--color-surface]/80 border border-[--color-surface] hover:border-[--color-signal]/50 rounded-xl text-xs font-mono text-[--color-text-primary] transition"
 >
 <div className="flex items-center gap-2 truncate">
 <Wifi className="w-3.5 h-3.5 text-[--color-signal] shrink-0" />
 <span className="font-semibold text-[--color-text-primary]">{targetHost}</span>
 <span className="text-[--color-text-secondary] text-[11px]">
 (
 {networkIps.find((i) => i.address === targetHost)?.label ||
 'Current Host'}
 )
 </span>
 </div>
 <ChevronDown className="w-3.5 h-3.5 text-[--color-text-secondary] shrink-0 ml-1" />
 </button>

 {/* Dropdown for multiple network adapters */}
 {showIpDropdown && (
 <div className="absolute top-full left-0 right-0 mt-1.5 glass-popup rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-48 overflow-y-auto">
 {networkIps.map((net) => (
 <button
 key={net.address}
 onClick={() => {
 setSelectedIp(net.address);
 setShowIpDropdown(false);
 }}
 className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition ${
 selectedIp === net.address
 ? 'bg-[--color-signal]/10 text-[--color-signal] font-bold'
 : 'text-[--color-text-secondary]'
 }`}
 >
 <span className="font-mono">{net.address}</span>
 <span className="text-[11px] text-[--color-text-secondary]">{net.label}</span>
 </button>
 ))}
 <button
 onClick={() => {
 setSelectedIp(window.location.hostname);
 setShowIpDropdown(false);
 }}
 className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 text-[--color-text-secondary] border-t border-[--color-surface]/50"
 >
 <span className="font-mono">{window.location.hostname}</span>
 <span className="text-[11px] text-[--color-text-secondary]">Browser Hostname</span>
 </button>
 </div>
 )}
 </div>

 {/* QR Code Canvas */}
 <div className="relative group z-10">
 <div
 className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-[--color-signal]/40 flex items-center justify-center transition-all"
 >
 <QRCodeSVG
 value={studentJoinUrl}
 size={qrSize}
 level="M"
 includeMargin={false}
 />
 </div>
 </div>

 {/* Room Code Badge */}
 <div className="flex items-center gap-2 text-center">
 <span className="text-xs text-[--color-text-secondary]">Room Code:</span>
 <span className="px-3 py-1 bg-[--color-surface] border border-[--color-signal]/30 rounded-xl font-mono font-bold text-sm text-[--color-signal] ">
 {roomCode}
 </span>
 </div>

 {/* Instructions */}
 <div className="bg-[--color-surface]/60 border border-[--color-surface]/50 rounded-2xl p-3.5 w-full text-xs text-[--color-text-secondary] space-y-1.5">
 <div className="font-bold text-[--color-text-primary] flex items-center gap-1.5">
 <Smartphone className="w-3.5 h-3.5 text-[--color-signal]" />
 Student Instructions:
 </div>
 <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-[--color-text-secondary] pl-1">
 <li>Connect to Teacher's Wi-Fi / Hotspot.</li>
 <li>Open Camera app & point at this QR code.</li>
 <li>Tap the link & plug in earphones to listen!</li>
 </ol>
 </div>

 {/* URL Display & Copy Button */}
 <div className="w-full flex items-center gap-2">
 <div className="flex-1 bg-[--color-base] border border-[--color-surface] rounded-xl px-3 py-2 text-[11px] font-mono text-[--color-text-secondary] truncate select-all">
 {studentJoinUrl}
 </div>
 <button
 onClick={handleCopy}
 className="flex items-center gap-1.5 px-3 py-2 bg-[--color-signal] hover:bg-[--color-signal]/90 text-[--color-base] font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
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
 <div className="pt-3 border-t border-[--color-surface] flex items-center justify-between text-xs text-[--color-text-secondary]">
 <span className="flex items-center gap-1.5">
 <Radio className="w-3.5 h-3.5 text-[--color-signal] animate-pulse" />
 Dynamic Direct-Join Active
 </span>
 <button
 onClick={onClose}
 className="text-[--color-text-secondary] hover:text-[--color-text-primary] px-3 py-1 rounded-lg hover:bg-[--color-surface] transition font-medium"
 >
 Done
 </button>
 </div>
 </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Inline Card Badge for Teacher Views
// ─────────────────────────────────────────────
interface ClassroomQrBadgeProps {
  roomCode: string;
}

export function ClassroomQrBadge({ roomCode }: ClassroomQrBadgeProps) {
  return (
    <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
      <div className="p-2 bg-[--color-signal]/15 text-[--color-signal] rounded-xl shrink-0">
        <QrCode className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs font-bold text-[--color-text-primary] flex items-center gap-1.5">
          Room {roomCode}
        </div>
        <p className="text-[11px] text-[--color-text-secondary]">
          Students scan to join
        </p>
      </div>
    </div>
  );
}
