App icons. Generate from a single 1024x1024 PNG with:

    cd frontend/desktop
    pnpm tauri icon path/to/kora-icon-1024.png

That populates 32x32.png, 128x128.png, 128x128@2x.png, icon.icns, icon.ico, and the Windows Store / Android variants. The paths referenced in tauri.conf.json must exist before `pnpm build:desktop` will succeed.
