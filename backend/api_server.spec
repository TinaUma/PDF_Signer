# PyInstaller spec for building the FastAPI sidecar binary
# Run: pyinstaller api_server.spec
# Output: dist/api-server (or dist/api-server.exe on Windows)

block_cipher = None

# SPECPATH is injected by PyInstaller and is the directory of this spec file.
a = Analysis(
    ['main.py'],
    pathex=[SPECPATH],
    binaries=[],
    # Bundle the text-annotation fonts so the sidecar renders text offline; they
    # land under sys._MEIPASS/fonts, where services.text_render._fonts_dir looks.
    datas=[('fonts', 'fonts')],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='api-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # no console window
    disable_windowed_traceback=False,
)
