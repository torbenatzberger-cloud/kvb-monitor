# GTFS Preprocessing Scripts

Dieses Verzeichnis enthält Scripts zur Aufbereitung von GTFS-Daten für die Live-Karte.

## GTFS-Daten herunterladen

### Köln (KVB)

```bash
# Download VRS GTFS (enthält KVB-Daten)
curl -o data/GTFS_VRS_mit_SPNV.zip http://download.vrsinfo.de/gtfs/GTFS_VRS_mit_SPNV.zip
```

### München (MVG)

```bash
# Download MVG GTFS
curl -o data/gtfs-mvg.zip https://www.mvg.de/api/gtfs/gtfs-mvg.zip
```

**Hinweis:** Falls die URLs nicht mehr aktuell sind, findest du die GTFS-Daten hier:
- KVB/VRS: https://www.vrs.de/open-data
- MVG: https://www.mvg.de/dienste/opendata.html

## GTFS verarbeiten

### Voraussetzungen

```bash
cd kvb-monitor-vercel
npm install
```

### Köln verarbeiten

```bash
npm run preprocess-gtfs:cologne ../data/GTFS_VRS_mit_SPNV.zip
```

Output: `kvb-monitor-vercel/public/gtfs/kvb/`
- `routes.json` - Linien-Metadaten
- `stops.json` - Haltestellen mit Koordinaten
- `shapes.json` - Streckenverläufe (vereinfacht)
- `schedule.json` - Fahrzeiten zwischen Stationen

### München verarbeiten

```bash
npm run preprocess-gtfs:munich ../data/gtfs-mvg.zip
```

Output: `kvb-monitor-vercel/public/gtfs/mvg/`

## Validierung

Nach dem Preprocessing solltest du folgendes überprüfen:

1. **Dateigröße:** Jede JSON-Datei sollte < 500 KB sein
2. **Stichproben:** Öffne `routes.json` und prüfe, ob alle Linien vorhanden sind
3. **Koordinaten:** Öffne `stops.json` und prüfe, ob Lat/Lng plausibel sind (Köln: ~50.9, ~6.9)

## Troubleshooting

### "Missing required file"
Die GTFS.zip enthält nicht alle benötigten Dateien. Stelle sicher, dass:
- `routes.txt`
- `trips.txt`
- `stops.txt`
- `stop_times.txt`
- `shapes.txt`

vorhanden sind.

### "Unknown city"
Du hast einen ungültigen City-Parameter angegeben. Gültige Werte: `cologne`, `munich`

### Dateien zu groß (> 500 KB)
Erhöhe die Toleranz der Douglas-Peucker-Vereinfachung in `preprocess-gtfs.js`:
```javascript
const simplified = simplifyLine(points, 0.0002); // statt 0.0001
```

## Updates

Die GTFS-Daten sollten alle 3 Monate aktualisiert werden, wenn sich Fahrpläne oder Strecken ändern.

Workflow:
1. Neue GTFS.zip herunterladen
2. Script ausführen
3. Daten validieren
4. Commit + Push
