const fs = require('fs');

function replaceInFile(file, replacements) {
    if (!fs.existsSync(file)) {
        console.error('File not found: ' + file);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');
    for (const [target, replacement] of replacements) {
        if (!content.includes(target)) {
            console.error('Target not found in ' + file + ':\n' + target);
        } else {
            content = content.split(target).join(replacement);
        }
    }
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
}

// ClassroomQrModal.tsx
replaceInFile('src/components/ClassroomQrModal.tsx', [
    [
        'const [isFullScreen, setIsFullScreen] = useState(false);\n  const [showIpDropdown, setShowIpDropdown] = useState(false);',
        'const [isFullScreen, setIsFullScreen] = useState(false);\n  const [showIpDropdown, setShowIpDropdown] = useState(false);\n  const [qrSize, setQrSize] = useState(210);\n\n  useEffect(() => {\n    const updateSize = () => {\n      if (isFullScreen) {\n        setQrSize(Math.min(320, window.innerWidth - 80));\n      } else {\n        setQrSize(Math.min(210, window.innerWidth - 120));\n      }\n    };\n    updateSize();\n    window.addEventListener(\'resize\', updateSize);\n    return () => window.removeEventListener(\'resize\', updateSize);\n  }, [isFullScreen]);'
    ],
    [
        'if (!isOpen) return null;\n\n  return (\n    <AnimatePresence>\n      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md"><div className="min-h-full flex items-center justify-center p-4">\n        <motion.div',
        'return (\n    <AnimatePresence>\n      {isOpen && (\n        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md" onClick={onClose}>\n          <div className={`min-h-full flex items-center justify-center ${isFullScreen ? \'p-0\' : \'p-4\'}`} onClick={onClose}>\n            <motion.div\n              onClick={(e) => e.stopPropagation()}'
    ],
    [
        'className={`bg-[--color-base] border border-[--color-surface] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${',
        'className={`bg-[--color-base] border border-[--color-surface] rounded-3xl shadow-2xl flex flex-col transition-all duration-300 ${'
    ],
    [
        'className="w-full flex items-center justify-between px-3 py-2 bg-[--color-surface]/80 border border-[--color-surface] hover:border-[--color-signal]/50 rounded-xl text-xs font-mono text-slate-200 transition"',
        'className="w-full flex items-center justify-between px-3 py-2 bg-[--color-surface]/80 border border-[--color-surface] hover:border-[--color-signal]/50 rounded-xl text-xs font-mono text-[--color-text-primary] transition"'
    ],
    [
        'hover:bg-slate-700/60 transition ${',
        'hover:bg-[--color-surface-raised] transition ${'
    ],
    [
        'hover:bg-slate-700/60 text-[--color-text-secondary]',
        'hover:bg-[--color-surface-raised] text-[--color-text-secondary]'
    ],
    [
        'className={`bg-white p-4 rounded-3xl shadow-2xl border-4 border-[--color-signal]/40 flex items-center justify-center transition-all ${\n                isFullScreen ? \'scale-110\' : \'\'\n              }`}',
        'className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-[--color-signal]/40 flex items-center justify-center transition-all"'
    ],
    [
        'size={isFullScreen ? 320 : 210}',
        'size={qrSize}'
    ],
    [
        'bg-[#0D1D1F]',
        'bg-[--color-base]'
    ],
    [
        'text-[#0D1D1F]',
        'text-[--color-base]'
    ],
    [
        '</motion.div>\n      </div>\n      </div>\n    </AnimatePresence>\n  );',
        '</motion.div>\n          </div>\n        </div>\n      )}\n    </AnimatePresence>\n  );'
    ],
    [
        '<span className="text-[10px] bg-slate-700 text-[--color-text-secondary] px-1.5 py-0.5 rounded font-mono">',
        '<span className="text-[10px] bg-[--color-surface-raised] text-[--color-text-secondary] px-1.5 py-0.5 rounded font-mono">'
    ]
]);

// StudentView.tsx
replaceInFile('src/StudentView.tsx', [
    [
        '<button\n              onClick={enableAudio}\n              className="w-full py-4 px-6 bg-[--color-signal]"\n            >',
        '<button\n              onClick={enableAudio}\n              className="w-full py-4 px-6 bg-[--color-signal] text-[--color-base] font-black text-lg rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg"\n            >'
    ]
]);

// Arch3TeacherView.tsx
replaceInFile('src/arch3/Arch3TeacherView.tsx', [
    [
        'import { useSpeechRecognition } from \'../hooks/useSpeechRecognition\';\n',
        ''
    ],
    [
        '  // Live Speech Captions\n  const { transcript, isListening, isSupported, toggleListening } = useSpeechRecognition();\n\n',
        ''
    ],
    [
        '        {/* --- Live Speech Captions Card (idea_analysis.md) --- */}\n        <div className="w-full max-w-xs bg-[--color-surface]/80 border border-[--color-surface] rounded-2xl p-3.5 mb-3 space-y-2">\n          <div className="flex items-center justify-between text-xs">\n            <span className="font-bold text-slate-200 flex items-center gap-1.5">\n              <Subtitles className="w-3.5 h-3.5 text-sky-400" />\n              Live Speech Captions\n            </span>\n            {isSupported && (\n              <button\n                onClick={toggleListening}\n                className={cn(\n                  \'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors\',\n                  isListening\n                    ? \'bg-emerald-500/20 text-emerald-300 border-emerald-500/40\'\n                    : \'bg-[--color-surface] text-[--color-text-secondary] border-[--color-surface] hover:text-[--color-text-primary]\'\n                )}\n              >\n                {isListening ? \'? Captions ON\' : \'Turn ON\'}\n              </button>\n            )}\n          </div>\n          <p className="text-[11px] text-[--color-text-secondary] bg-[--color-base]/90 p-2 rounded-xl min-h-[36px] italic leading-relaxed border border-[--color-surface]/80">\n            {transcript || (isListening ? \'Listening for speech…\' : \'Tap Turn ON for real-time speech captions.\')}\n          </p>\n        </div>\n',
        ''
    ]
]);

// useSpeechRecognition.ts
replaceInFile('src/hooks/useSpeechRecognition.ts', [
    [
        'interface SpeechRecognitionHookProps {\n  onTranscript?: (text: string, isFinal: boolean) => void;\n  lang?: string;\n}',
        'interface SpeechRecognitionHookProps {\n  onTranscript?: (text: string, isFinal: boolean) => void;\n  lang?: string;\n  onError?: (errorMessage: string) => void;\n}'
    ],
    [
        'export function useSpeechRecognition({\n  onTranscript,\n  lang = \'en-IN\',\n}: SpeechRecognitionHookProps = {}) {',
        'export function useSpeechRecognition({\n  onTranscript,\n  lang = \'en-IN\',\n  onError,\n}: SpeechRecognitionHookProps = {}) {'
    ],
    [
        'recognition.onerror = (event: Event) => {\n      console.warn(\'Speech recognition notice:\', event);\n    };',
        '// eslint-disable-next-line @typescript-eslint/no-explicit-any\n    recognition.onerror = (event: any) => {\n      console.warn(\'Speech recognition notice:\', event);\n      if (event.error === \'network\') {\n        onError?.(\'Captions unavailable — no internet connection\');\n        setIsListening(false);\n      }\n    };'
    ]
]);

// InstallPrompt.tsx
replaceInFile('src/components/InstallPrompt.tsx', [
    [
        'if (sessionStorage.getItem(\'stentor_install_dismissed\')) {\n      sessionStorage.setItem(\'classcast_install_dismissed\', sessionStorage.getItem(\'stentor_install_dismissed\')!);\n      sessionStorage.removeItem(\'stentor_install_dismissed\');\n    }',
        'if (sessionStorage.getItem(\'classcast_install_dismissed\')) {\n      sessionStorage.setItem(\'stentor_dismissed\', sessionStorage.getItem(\'classcast_install_dismissed\')!);\n      sessionStorage.removeItem(\'classcast_install_dismissed\');\n    }'
    ],
    [
        'const dismissed = sessionStorage.getItem(\'classcast_install_dismissed\');',
        'const dismissed = sessionStorage.getItem(\'stentor_dismissed\');'
    ],
    [
        'sessionStorage.setItem(\'classcast_install_dismissed\', \'true\');',
        'sessionStorage.setItem(\'stentor_dismissed\', \'true\');'
    ]
]);
