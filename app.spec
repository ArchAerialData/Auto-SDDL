# app.spec
datas = [
    ('ui/index.html', 'ui'),
    ('ui/static', 'ui/static'),
    ('ui/js', 'ui/js'),
    ('forms/schema.json', 'forms'),
    ('templates', 'templates'),
]

block_cipher = None
a = Analysis(['app.py'], pathex=[], binaries=[], datas=datas, hiddenimports=[], noarchive=False)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(pyz, a.scripts, a.binaries, a.zipfiles, a.datas, name='SDDL-DS', console=False)
app = BUNDLE(exe, name='SDDL-DS.app', icon=None)  # macOS target
