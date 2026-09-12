import re

files = [
    ('src/StudentView.tsx', 'hasStartedAudio', 'barVal'),
    ('src/arch1/Arch1StudentView.tsx', 'isAudioUnlocked', 'val'),
    ('src/arch3/Arch3StudentView.tsx', 'hasStartedAudio', 'barVal'),
    ('src/arch4/Arch4StudentView.tsx', 'isAudioUnlocked', 'val'),
]

CONTAINER = '<div className="flex items-end justify-center gap-[4px] h-20 px-4">'

for fp, sv, bv in files:
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    new_container = '<div data-state={' + sv + ' ? "live" : "waiting"} className="flex items-end justify-center gap-[4px] h-20 px-4">'
    if CONTAINER in c:
        c = c.replace(CONTAINER, new_container)
        print(fp, '- container OK')
    else:
        print(fp, '- container MISS')

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    print(fp, '- written')
