import re

# Each file has different variable names for state and bar value
configs = [
    ('src/StudentView.tsx', 'hasStartedAudio', 'barVal'),
    ('src/arch1/Arch1StudentView.tsx', 'isAudioUnlocked', 'val'),
    ('src/arch3/Arch3StudentView.tsx', 'hasStartedAudio', 'barVal'),
    ('src/arch4/Arch4StudentView.tsx', 'isAudioUnlocked', 'val'),
]

for fp, sv, bv in configs:
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()

    # Build the regex pattern dynamically
    # Matches: height line + backgroundColor + the two color ternary lines
    pat = (
        r'(height: `\$\{Math\.max\(6, ' + re.escape(bv) + r' \* 72\)\}px`,)'
        r'\s*backgroundColor: ' + re.escape(sv) +
        r'\s*\? `rgba\(34, 197, 94, \$\{0\.4 \+ ' + re.escape(bv) + r' \* 0\.6\}\)`'
        r'\s*: `rgba\(245, 158, 11, \$\{0\.4 \+ ' + re.escape(bv) + r' \* 0\.6\}\)`,'
    )
    c2, n = re.subn(pat, r'\1', c, flags=re.DOTALL)
    if n > 0:
        print(f'{fp} - backgroundColor removed ({n} occurrence)')
    else:
        print(f'{fp} - WARN: pattern not found, skipping color removal')

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c2)
    print(f'{fp} - written')
