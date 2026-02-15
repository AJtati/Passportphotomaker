# macOS Desktop App Build Guide (Electron)

This project can be packaged as a macOS desktop app (`.app`) and installer (`.dmg`).

## 1. Prerequisites
- macOS
- Node.js + npm

## 2. Install dependencies
```bash
cd /Users/ajithsuryathati/Repos/Passportphotomaker
npm install
```

## 3. Run locally as desktop app
```bash
npm run electron:start
```

## 4. Build macOS distributables
```bash
npm run electron:dist:mac
```

Output files are created in:
```bash
release/
```

## 5. Apple Silicon-only build (optional)
```bash
npm run electron:dist:mac:arm64
```

## Notes
- Current build is unsigned (good for local testing/distribution to your own Mac).
- For public macOS distribution without Gatekeeper warnings, you need Apple Developer signing + notarization.
