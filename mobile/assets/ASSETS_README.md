# Reusa - Assets Required for Publication

## Required Assets

### 1. App Icon (`icon.png`)
- **Size**: 1024x1024 px
- **Format**: PNG (no transparency for iOS)
- **Usage**: Main app icon for both stores
- **Location**: `assets/icon.png`

### 2. Adaptive Icon - Android (`adaptive-icon.png`)
- **Size**: 1024x1024 px
- **Format**: PNG with transparency
- **Notes**: This is the foreground layer. Background color is set in app.json (#2D9B6E)
- **Location**: `assets/adaptive-icon.png`

### 3. Splash Screen (`splash.png`)
- **Size**: 1284x2778 px (or similar high resolution)
- **Format**: PNG
- **Notes**: Center your logo, background color is #2D9B6E
- **Location**: `assets/splash.png`

### 4. Notification Icon - Android (`notification-icon.png`)
- **Size**: 96x96 px
- **Format**: PNG (white icon on transparent background)
- **Notes**: Must be monochrome (white) for Android notifications
- **Location**: `assets/notification-icon.png`

### 5. Favicon - Web (`favicon.png`)
- **Size**: 48x48 px
- **Format**: PNG
- **Location**: `assets/favicon.png`

## Store Assets (Not in app bundle)

### App Store (iOS)
- Screenshots: 6.5" (1284x2778), 5.5" (1242x2208)
- App Preview videos (optional)
- App description (4000 chars max)
- Keywords (100 chars max)
- Privacy Policy URL

### Google Play (Android)
- Feature Graphic: 1024x500 px
- Screenshots: min 2, max 8
- Short description (80 chars)
- Full description (4000 chars)
- Privacy Policy URL

## Design Guidelines

### Brand Colors
- Primary Green: `#2D9B6E`
- Accent Orange: `#FF6B4A`
- Background: `#FAFAFA`

### Logo Requirements
- The Reusa logo should be centered
- Use the leaf/recycle motif
- Ensure readability at small sizes

## Quick Generation Tools

1. **App Icon Generator**: https://appicon.co/
2. **Splash Screen Generator**: https://apetools.webprofusion.com/
3. **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/
