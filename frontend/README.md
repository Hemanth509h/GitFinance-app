# Gig Finances — Landing Page

TypeScript Next.js marketing site for the Gig Finances Android app.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start TypeScript Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## APK Download Setup

Place your compiled APK at:

```
frontend/public/gig-finances.apk
```

The download button calls `/download` and serves that file.

### Build the APK

```bash
# From project root:
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../frontend/public/gig-finances.apk
```

## Deploy

```bash
npm run build
npm start
```
