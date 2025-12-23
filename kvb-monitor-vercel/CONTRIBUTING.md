# Entwicklungs-Guide für KVB Monitor

## Übersicht der Umgebungen

| Umgebung | Branch | URL | Badge |
|----------|--------|-----|-------|
| **Production** | `main` | kvb-monitor.de | Kein Badge |
| **Development** | `develop` | dev.kvb-monitor.de | 🟠 DEV |
| **Lokal** | beliebig | localhost:3000 | 🟣 LOCAL |

## Workflow: Feature entwickeln & deployen

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  feature/*   │ ──▶ │   develop    │ ──▶ │     main     │
│  (lokal)     │     │   (dev.*)    │     │   (live)     │
└──────────────┘     └──────────────┘     └──────────────┘
      LOCAL              DEV               PRODUCTION
```

### 1. Neues Feature entwickeln

```bash
# Aktuellen develop-Branch holen
git checkout develop
git pull origin develop

# Feature-Branch erstellen
git checkout -b feature/mein-neues-feature

# Entwickeln & testen (lokal)
npm run dev
# → Öffne http://localhost:3000
# → Du siehst das lila "LOCAL" Badge
```

### 2. Feature auf DEV testen

```bash
# Änderungen committen
git add .
git commit -m "Neues Feature: Beschreibung"

# Auf develop pushen (löst DEV-Deployment aus)
git checkout develop
git merge feature/mein-neues-feature
git push origin develop

# → Automatisches Deployment auf dev.kvb-monitor.de
# → Du siehst das orange "DEV" Badge
```

### 3. Ins Live deployen

Wenn alles auf DEV funktioniert:

```bash
# Auf main mergen
git checkout main
git pull origin main
git merge develop
git push origin main

# → Automatisches Deployment auf kvb-monitor.de
# → Kein Badge (Production)
```

## Lokale Entwicklung starten

### Erstmalige Einrichtung

```bash
# Repository klonen
git clone https://github.com/dein-username/kvb-monitor.git
cd kvb-monitor/kvb-monitor-vercel

# Dependencies installieren
npm install

# Environment-Variablen einrichten
cp .env.example .env.local
# → Bearbeite .env.local und füge deine Keys ein
```

### Entwicklungsserver starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Environment-Variablen

Siehe `.env.example` für alle benötigten Variablen.

**Wichtig:**
- `.env.local` wird NICHT ins Git committed
- Produktions-Keys werden in Vercel konfiguriert
- Für lokale Entwicklung reichen oft die Supabase-Keys

## Vercel Umgebungen

Vercel behandelt Branches automatisch:

| Git Branch | Vercel Environment | Auto-Deploy |
|------------|-------------------|-------------|
| `main` | Production | ✅ |
| `develop` | Preview | ✅ |
| `feature/*` | Preview | ✅ |
| Pull Requests | Preview | ✅ |

## Checkliste vor dem Live-Deployment

- [ ] Feature auf `develop` gepusht
- [ ] Auf dev.kvb-monitor.de getestet
- [ ] Keine Fehler in der Vercel-Console
- [ ] Auf verschiedenen Geräten getestet (Desktop, Mobile)
- [ ] Disruption-Banner funktioniert noch
- [ ] Admin-Panel funktioniert noch

## Hilfreiche Befehle

```bash
# Build lokal testen (wie Vercel)
npm run build

# Linting
npm run lint

# Dependencies aktualisieren
npm update
```

## Troubleshooting

### "DEV"-Badge erscheint auf Production
Das Badge erscheint nur bei:
- `localhost` / `127.0.0.1`
- Domains die mit `dev.` beginnen
- `*.vercel.app` Domains

Falls das Badge auf Production erscheint, prüfe die Domain-Konfiguration.

### Deployment hängt
1. Prüfe Vercel Dashboard auf Fehler
2. Prüfe die Build-Logs
3. Stelle sicher, dass alle Environment-Variablen gesetzt sind
