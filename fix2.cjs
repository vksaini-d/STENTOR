const fs = require('fs');

function replaceRegex(file, pattern, replacement) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(pattern, replacement);
    fs.writeFileSync(file, content);
    console.log('Replaced in ' + file);
}

replaceRegex('src/components/ClassroomQrModal.tsx',
    /const \[isFullScreen, setIsFullScreen\] = useState\(false\);\s*const \[showIpDropdown, setShowIpDropdown\] = useState\(false\);/,
    "const [isFullScreen, setIsFullScreen] = useState(false);\n  const [showIpDropdown, setShowIpDropdown] = useState(false);\n  const [qrSize, setQrSize] = useState(210);\n\n  useEffect(() => {\n    const updateSize = () => {\n      if (isFullScreen) {\n        setQrSize(Math.min(320, window.innerWidth - 80));\n      } else {\n        setQrSize(Math.min(210, window.innerWidth - 120));\n      }\n    };\n    updateSize();\n    window.addEventListener('resize', updateSize);\n    return () => window.removeEventListener('resize', updateSize);\n  }, [isFullScreen]);"
);

replaceRegex('src/components/ClassroomQrModal.tsx',
    /if \(!isOpen\) return null;\s*return \(\s*<AnimatePresence>\s*<div className="fixed inset-0 z-50 overflow-y-auto bg-black\/80 backdrop-blur-md"><div className="min-h-full flex items-center justify-center p-4">\s*<motion\.div/,
    "return (\n    <AnimatePresence>\n      {isOpen && (\n        <div className=\"fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md\" onClick={onClose}>\n          <div className={`min-h-full flex items-center justify-center ${isFullScreen ? 'p-0' : 'p-4'}`} onClick={onClose}>\n            <motion.div\n              onClick={(e) => e.stopPropagation()}"
);

replaceRegex('src/components/ClassroomQrModal.tsx',
    /className={`bg-white p-4 rounded-3xl shadow-2xl border-4 border-\[--color-signal\]\/40 flex items-center justify-center transition-all \${\s*isFullScreen \? 'scale-110' : ''\s*}`}/,
    'className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-[--color-signal]/40 flex items-center justify-center transition-all"'
);

replaceRegex('src/components/ClassroomQrModal.tsx',
    /<\/motion\.div>\s*<\/div>\s*<\/div>\s*<\/AnimatePresence>\s*\);\s*}/,
    "</motion.div>\n          </div>\n        </div>\n      )}\n    </AnimatePresence>\n  );\n}"
);

replaceRegex('src/StudentView.tsx',
    /<button\s*onClick={enableAudio}\s*className="w-full py-4 px-6 bg-\[--color-signal\]"/,
    '<button\n                onClick={enableAudio}\n                className="w-full py-4 px-6 bg-[--color-signal] text-[--color-base] font-black text-lg rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg"'
);

replaceRegex('src/arch3/Arch3TeacherView.tsx',
    /\s*\/\/ Live Speech Captions\s*const { transcript, isListening, isSupported, toggleListening } = useSpeechRecognition\(\);\s*/,
    "\n  "
);

replaceRegex('src/arch3/Arch3TeacherView.tsx',
    /\s*{\/\* --- Live Speech Captions Card.*?<\/div>\s*/s,
    "\n  "
);

replaceRegex('src/components/InstallPrompt.tsx',
    /if \(sessionStorage\.getItem\('stentor_install_dismissed'\)\) {\s*sessionStorage\.setItem\('classcast_install_dismissed', sessionStorage\.getItem\('stentor_install_dismissed'\)!\);\s*sessionStorage\.removeItem\('stentor_install_dismissed'\);\s*}/,
    "if (sessionStorage.getItem('classcast_install_dismissed')) {\n      sessionStorage.setItem('stentor_dismissed', sessionStorage.getItem('classcast_install_dismissed')!);\n      sessionStorage.removeItem('classcast_install_dismissed');\n    }"
);

