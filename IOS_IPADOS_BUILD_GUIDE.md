# iOS and iPadOS Build Guide (Capacitor)

This project is now prepared with iOS scripts and dependency support.

## 1. Prerequisites (Mac only)
- macOS with latest Xcode installed
- Apple Developer account
- Node.js + npm
- CocoaPods (`sudo gem install cocoapods`)

## 2. Get code on Mac
```bash
git clone https://github.com/AJtati/Passportphotomaker.git
cd Passportphotomaker/passport-photo-app
npm install
```

## 3. Add and sync iOS platform
```bash
npm run ios:add
npm run ios:sync
```

## 4. Open Xcode project
```bash
npm run ios:open
```

## 5. Xcode settings for iPhone + iPad
- Select target `App`
- `General` -> `Deployment Info`:
  - Enable iPhone and iPad devices (`Universal`)
  - Choose minimum iOS version you support
- `Signing & Capabilities`:
  - Select your Team
  - Set unique Bundle Identifier (for example `com.ajtati.passportphoto`)
- `Display Name`: set app name for home screen

## 6. Screen-size compatibility checklist
- Keep layout constraints adaptive (already handled by responsive web layout and Bootstrap grid).
- Test on iPhone SE, iPhone 15/16 Pro Max class devices, and iPad 11"/13" simulators.
- Test both portrait and landscape.
- Verify safe-area behavior for notched iPhones and iPads.
- Confirm canvas previews scale correctly at narrow widths.

## 7. Create app icons and splash
- In Xcode, open `Assets.xcassets`
- Replace `AppIcon` set with iOS-required icon sizes
- Configure launch screen as needed

## 8. Build and distribute
- Product -> Archive
- Distribute App -> App Store Connect
- Upload to TestFlight for testing, then submit for review

## 9. Updating app after code changes
```bash
npm run build
npm run ios:sync
npm run ios:open
```

Then rebuild/archive in Xcode.
