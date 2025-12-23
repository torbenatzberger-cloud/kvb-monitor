# Live Map Feature - Deployment Status

**Status:** ✅ **LIVE-READY & DEPLOYED**
**Last Updated:** 2025-12-24
**Deployment URL:** https://kvb-monitor-git-develop-torbenatzberger-cloud.vercel.app
**Mode:** Live tracking with demo fallback

---

## 🎯 Feature Overview

Die Live-Karte visualisiert geschätzte Echtzeit-Positionen aller Bahnen basierend auf:
- GTFS-Fahrplandaten (statisch)
- Live-Abfahrtszeiten mit Verspätungen (von bestehenden APIs)
- Client-seitiger Position-Interpolation

### Verfügbare Ansichten

1. **City View (Leaflet)** - Übersichtskarte mit mehreren Linien
2. **Line View (SVG)** - Detailansicht für einzelne Linien

---

## 📊 Implementierter Umfang

### Köln (KVB)
- ✅ **25 reale Stationen** mit akkuraten Koordinaten
- ✅ **11 Linien** (1, 3, 4, 5, 7, 9, 12, 13, 15, 16, 17, 18) in `routes.json`
- ✅ **Fahrpläne** für 5 Linien (1, 3, 5, 7, 9) in `schedule.json`
- ✅ **Shapes** für 3 Linien (5, 7, 9) in `shapes.json`
- ✅ Realistische Fahrzeiten: 60-180 Sekunden zwischen Stationen

**Stations-Beispiele:**
- Neumarkt, Dom/Hbf, Heumarkt
- Barbarossaplatz, Rudolfplatz
- Deutz/Messe, Kalk Post, Wiener Platz
- Ebertplatz, Hansaring, Friesenplatz
- Chlodwigplatz, Severinstraße, Ubierring

### München (MVG)
- ✅ **31 reale Stationen** mit akkuraten Koordinaten
- ✅ **15 Linien** (U1-U8, Tram 16, 17, 19, 20, 21, 27, 28) in `routes.json`
- ✅ **Fahrpläne** für 8 Linien (U1-U6, Tram 16, 19) in `schedule.json`
- ✅ **Shapes** für 5 Linien (U2, U3, U6, Tram 16, 19) in `shapes.json`
- ✅ Realistische Fahrzeiten: 60-420 Sekunden zwischen Stationen

**Stations-Beispiele:**
- Marienplatz, Karlsplatz (Stachus), Odeonsplatz
- München Hauptbahnhof, Ostbahnhof
- Münchner Freiheit, Scheidplatz, Olympiazentrum
- Neuperlach Zentrum/Süd, Messestadt Ost
- Feldmoching, Arabellapark, Theresienwiese

---

## 🗂️ Dateistruktur

```
kvb-monitor-vercel/
├── app/
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapContainer.js         # Hauptkomponente
│   │   │   ├── CityMapView.js          # Leaflet View
│   │   │   ├── LineMapView.js          # SVG View
│   │   │   └── MapModeToggle.js        # UI Toggle
│   │   └── hooks/
│   │       ├── useGTFSData.js          # GTFS-Daten laden
│   │       ├── useVehicleTracking.js   # Fahrzeug-Tracking
│   │       └── useMapAnimation.js      # 60 FPS Animation
│   ├── lib/
│   │   └── gtfs/
│   │       ├── vehicleTracker.js       # Position-Berechnung
│   │       └── interpolation.js        # Math-Utilities
│   ├── page.js                         # ✅ Köln integriert
│   └── muenchen/
│       └── page.js                     # ✅ München integriert
└── public/
    └── gtfs/
        ├── kvb/                        # Köln
        │   ├── routes.json    (1.5 KB)
        │   ├── stops.json     (2.7 KB)
        │   ├── shapes.json    (1.5 KB)
        │   └── schedule.json  (2.5 KB)
        └── mvg/                        # München
            ├── routes.json    (2.2 KB)
            ├── stops.json     (3.6 KB)
            ├── shapes.json    (3.3 KB)
            └── schedule.json  (8.6 KB)
```

**Gesamtgröße:** ~26 KB (alle GTFS-Dateien, unkomprimiert)
**Komprimiert:** ~8 KB (mit gzip)

---

## 🧪 Test-Anleitung

### 1. Basis-Funktionalität testen

**Köln:**
1. Öffne: https://kvb-monitor-git-develop-torbenatzberger-cloud.vercel.app
2. Wähle eine Station (z.B. "Neumarkt")
3. Wähle Linien-Filter (z.B. Linie 5, 7)
4. Klicke auf "🗺️ Live-Karte anzeigen" Button
5. **Erwartung:**
   - Leaflet-Karte mit OpenStreetMap
   - Linienverläufe in korrekten Farben
   - Fahrzeug-Marker bewegen sich

**München:**
1. Öffne: https://kvb-monitor-git-develop-torbenatzberger-cloud.vercel.app/muenchen
2. Wähle eine Station (z.B. "Marienplatz")
3. Wähle Linien (z.B. U3, U6)
4. Klicke auf "🗺️ Live-Karte anzeigen"
5. **Erwartung:** Gleiche Funktionalität wie Köln

### 2. View-Modi testen

**City View → Line View:**
1. Öffne Live-Karte mit mehreren Linien
2. Klicke auf eine Linienverlauf (Polyline)
3. **Erwartung:** Wechsel zu SVG Line View
4. Klicke "🔙 Zurück zur Übersicht"
5. **Erwartung:** Zurück zu City View

**Toggle-Buttons:**
1. In City View: Klicke "📍 Linienansicht"
2. **Erwartung:** Umschalten zu Line View für erste Linie
3. Klicke "🗺️ Stadtansicht"
4. **Erwartung:** Zurück zu City View

### 3. Daten-Validierung

**Console-Logs prüfen (F12 → Console):**
```
✅ Erwartete Logs:
📦 Using cached GTFS data for kvb (beim zweiten Laden)
🚗 Vehicle tracker initialized
📍 Calculated X vehicle positions

❌ Keine Fehler sollten auftreten:
- "Module not found"
- "Failed to load GTFS"
- "Cannot read property of undefined"
```

**LocalStorage prüfen (F12 → Application → Local Storage):**
```
Erwartete Keys:
- gtfs_kvb_v1 (Köln)
- gtfs_mvg_v1 (München)

Größe: ~10-15 KB pro Stadt
```

### 4. Performance-Tests

**Metriken (F12 → Performance):**
- Initiales Laden: < 2 Sekunden
- FPS: 60 fps (Desktop), 30 fps (Mobile)
- Memory: < 100 MB nach 5 Minuten

**Mit vielen Fahrzeugen:**
1. Wähle Station mit hoher Frequenz (z.B. "Neumarkt", "Marienplatz")
2. Aktiviere alle Linien
3. **Erwartung:** Smooth Animation, keine Ruckler

### 5. Mobile-Tests

**Responsive Design:**
- iPhone/Android Chrome
- Touch-Gesten: Pan/Zoom auf Karte
- Tooltips via Tap (nicht Hover)

### 6. Edge Cases

**Keine Daten verfügbar:**
1. Offline gehen (DevTools → Network → Offline)
2. Seite neu laden
3. **Erwartung:** Fehlermeldung "⚠️ Keine Live-Daten verfügbar"

**Keine Shapes vorhanden:**
1. Wähle Linie ohne Shapes (z.B. Linie 1, 3, 4 in Köln)
2. **Erwartung:** Lineare Interpolation zwischen Stationen

---

## 🐛 Bekannte Limitierungen

### 1. Mock-Daten
- **Problem:** Keine echten GTFS-Daten, nur realistische Mock-Daten
- **Impact:** Positionen sind Schätzungen, nicht GPS-genau
- **Workaround:** Disclaimer ist prominent angezeigt
- **Fix:** Siehe `GTFS_DATA_SOURCE.md` für echte Daten

### 2. Unvollständige Linien-Daten
- **Köln:** Nur 5 von 11 Linien haben Fahrpläne
- **München:** Nur 8 von 15 Linien haben Fahrpläne
- **Impact:** Linien ohne Fahrplan zeigen keine Fahrzeuge
- **Fix:** Mehr Segments zu `schedule.json` hinzufügen

### 3. Keine GPS-Echtzeitdaten
- **Problem:** Positionen basieren auf Fahrplan + Verspätung
- **Impact:** Bei Umleitungen/Störungen ungenau
- **Workaround:** Disclaimer erklärt dies
- **Fix:** Integration mit GPS-APIs (falls verfügbar)

### 4. Client-seitige Berechnung
- **Problem:** ~26 KB GTFS-Daten müssen geladen werden
- **Impact:** Initial Load Time erhöht
- **Mitigation:** LocalStorage Caching (7 Tage)

---

## 🔧 Troubleshooting

### Problem: "Module not found: interpolation"
**Ursache:** Import-Pfade verwenden `@/app/lib` statt relative Pfade
**Fix:** Bereits behoben in Commit `454ce07`
**Verifikation:** `grep -r "@/app/lib" app/components/hooks/` sollte leer sein

### Problem: Keine Fahrzeuge sichtbar
**Ursache:** Linie hat keinen Fahrplan in `schedule.json`
**Debug:**
1. F12 → Console: "No schedule data for line X"
2. Prüfe `public/gtfs/{kvb,mvg}/schedule.json`
3. Füge Segments für diese Linie hinzu

**Temporärer Fix:** Wähle Linie mit Daten (Köln: 1,3,5,7,9 | München: U1-U6, 16, 19)

### Problem: Karte lädt nicht
**Ursache:** Leaflet SSR-Probleme
**Verifikation:**
```bash
grep "dynamic.*ssr.*false" app/components/map/CityMapView.js
```
**Sollte zeigen:**
```javascript
const MapCanvas = dynamic(() => import('./MapCanvas'), { ssr: false });
```

### Problem: Cache wird nicht geleert
**Ursache:** LocalStorage voll (5 MB Limit)
**Fix:**
```javascript
// In Browser Console:
localStorage.clear();
location.reload();
```

---

## 📈 Deployment-Historie

| Commit | Datum | Beschreibung | Status |
|--------|-------|--------------|--------|
| `4595905` | 2025-12-23 | Munich GTFS mock data | ✅ Deployed |
| `a8b2109` | 2025-12-23 | Enhanced Cologne data (25 stations) | ✅ Deployed |
| `454ce07` | 2025-12-23 | Fix import paths | ✅ Deployed |
| `f646c44` | 2025-12-23 | Initial mock data | ✅ Deployed |
| `b11767d` | 2025-12-23 | Documentation | ✅ Deployed |
| `ab8c108` | 2025-12-23 | Integration (Phase 5) | ✅ Deployed |
| `6bc0ac9` | 2025-12-23 | Map UI (Phases 3-4) | ✅ Deployed |
| `86529e8` | 2025-12-23 | Core tracking (Phases 1-2) | ✅ Deployed |

**Vercel Deployment:** Auto-deployed via GitHub Push Hooks

---

## 🚀 Nächste Schritte (Optional)

### 1. Echte GTFS-Daten
- [ ] VRS Open Data Portal besuchen
- [ ] GTFS.zip manuell herunterladen
- [ ] `npm run preprocess-gtfs:cologne data/GTFS_VRS.zip` ausführen
- [ ] Validieren und deployen

### 2. Mehr Linien-Daten
- [ ] Restliche KVB-Linien (4, 12, 13, 15, 16, 17, 18) zu `schedule.json` hinzufügen
- [ ] Restliche MVG-Linien (U7, U8, Tram 17, 20, 21, 27, 28) hinzufügen
- [ ] Shapes für wichtige Linien ergänzen

### 3. Performance-Optimierungen
- [ ] React.memo() für Marker-Komponenten
- [ ] Virtual scrolling für große Fahrzeug-Listen
- [ ] Web Worker für Position-Berechnung (falls nötig)

### 4. Features
- [ ] Fahrzeug-Details bei Klick (Fahrzeug-ID, Verspätung, nächste Haltestelle)
- [ ] Filter: "Nur verspätete Fahrzeuge anzeigen"
- [ ] Animation Speed-Control (0.5x - 2x)
- [ ] Export als GeoJSON

---

## 📞 Support

**Fragen zur Implementierung:**
- Siehe `LIVE_MAP_DOCUMENTATION.md` (technische Details)
- Siehe `LIVE_MAP_QUICK_START.md` (Entwickler-Guide)

**GTFS-Daten:**
- Siehe `GTFS_DATA_SOURCE.md` (Datenquellen)

**Bugs/Issues:**
- GitHub Issues: https://github.com/torbenatzberger-cloud/kvb-monitor/issues

---

**Erstellt:** 2025-12-23
**Status:** ✅ Feature vollständig implementiert und deployed
**Tester:** Bereit für User Testing auf `develop`
