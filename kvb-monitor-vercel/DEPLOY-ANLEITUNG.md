# 🚀 KVB Monitor auf Vercel deployen

## Schritt-für-Schritt Anleitung

---

## 📋 Was du brauchst

1. **GitHub Account** (kostenlos: https://github.com/signup)
2. **Vercel Account** (kostenlos: https://vercel.com/signup - mit GitHub anmelden!)
3. Die Projektdateien (der `kvb-monitor-vercel` Ordner)

---

## 🚀 Teil 1: GitHub Repository erstellen

### Schritt 1.1: Neues Repository auf GitHub

1. Gehe zu https://github.com/new
2. **Repository name:** `kvb-monitor`
3. **Description:** `Live KVB Abfahrtsmonitor für Köln`
4. ✅ **Public** auswählen
5. ❌ NICHT "Add a README file" ankreuzen
6. Klicke **"Create repository"**

### Schritt 1.2: Projektdateien hochladen

**Option A: Über die GitHub Website (einfacher)**

1. Im neuen Repository, klicke **"uploading an existing file"**
2. Ziehe den gesamten INHALT des `kvb-monitor-vercel` Ordners rein:
   - `app/` (ganzer Ordner)
   - `package.json`
   - `next.config.js`
   - `.gitignore`
3. Unten bei "Commit changes": Nachricht eingeben, z.B. "Initial commit"
4. Klicke **"Commit changes"**

**Option B: Über Terminal (für Fortgeschrittene)**

```bash
cd ~/Downloads/kvb-monitor-vercel

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/kvb-monitor.git
git push -u origin main
```

---

## 🚀 Teil 2: Auf Vercel deployen

### Schritt 2.1: Bei Vercel anmelden

1. Gehe zu https://vercel.com
2. Klicke **"Sign Up"** → **"Continue with GitHub"**
3. Autorisiere Vercel für deinen GitHub Account

### Schritt 2.2: Projekt importieren

1. Im Vercel Dashboard, klicke **"Add New..."** → **"Project"**
2. Unter "Import Git Repository" findest du dein `kvb-monitor` Repository
3. Klicke **"Import"**

### Schritt 2.3: Deployment konfigurieren

Die Einstellungen sollten automatisch erkannt werden:
- **Framework Preset:** Next.js ✅
- **Root Directory:** `./` ✅
- **Build Command:** `next build` ✅
- **Output Directory:** `.next` ✅

→ Klicke einfach **"Deploy"**

### Schritt 2.4: Warten...

Vercel baut jetzt dein Projekt. Das dauert ca. 1-2 Minuten.

Du siehst:
- 🔵 Building...
- 🔵 Deploying...
- ✅ **Ready!**

---

## 🎉 Teil 3: Fertig!

Nach dem Deployment bekommst du eine URL wie:

```
https://kvb-monitor-xyz123.vercel.app
```

Diese URL ist dein **Live KVB Monitor!** 🚋

### Eigene Domain (Optional)

1. In Vercel, gehe zu deinem Projekt → **"Settings"** → **"Domains"**
2. Du kannst:
   - Eine **Vercel Subdomain** ändern: `kvb.vercel.app` (wenn verfügbar)
   - Eine **eigene Domain** verbinden (falls du eine hast)

---

## 🔧 Troubleshooting

### "Build failed"

**Lösung:** Prüfe ob alle Dateien korrekt hochgeladen wurden:
```
kvb-monitor/
├── app/
│   ├── api/
│   │   ├── departures/
│   │   │   └── [stopId]/
│   │   │       └── route.js
│   │   └── health/
│   │       └── route.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── .gitignore
├── next.config.js
└── package.json
```

### "404 Not Found" auf der API

**Lösung:** Die App Router API Routes müssen in `app/api/` liegen, nicht in `pages/api/`.

### Änderungen machen

1. Dateien auf GitHub bearbeiten (oder lokal ändern und pushen)
2. Vercel deployed automatisch bei jedem Push! 🚀

---

## 📱 Als App auf dem Handy

Die URL funktioniert auch auf dem Handy! Du kannst sie als "Web App" zum Homescreen hinzufügen:

**iPhone:**
1. Öffne die URL in Safari
2. Teilen-Button → "Zum Home-Bildschirm"

**Android:**
1. Öffne die URL in Chrome
2. Menü (⋮) → "Zum Startbildschirm hinzufügen"

---

## 🔄 Updates

Wenn du die App updaten willst:

1. Änderungen auf GitHub machen (direkt oder via Push)
2. Vercel erkennt das automatisch und deployed neu
3. Nach ~1 Minute ist die neue Version live!

---

## ❓ FAQ

**Ist das wirklich kostenlos?**
Ja! Vercel's Hobby Plan ist kostenlos und reicht völlig aus.

**Wie viele Besucher hält das aus?**
Vercel's kostenloser Plan erlaubt 100GB Bandwidth/Monat - das reicht für tausende Besucher.

**Kann ich die URL ändern?**
Ja, unter Settings → Domains kannst du eine andere Subdomain wählen.

**Funktioniert das auch ohne Internet?**
Nein, die App braucht Internet um Live-Daten zu laden.

---

**Viel Erfolg! 🚋**
