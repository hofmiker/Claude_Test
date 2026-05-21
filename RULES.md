# DHL City Drive — Entwicklungsregeln & Koordinatensystem

## Koordinatensystem

```
        NORD (+Z)
           ↑
     ──────┼────── +X (EAST)
           │
        SÜD (−Z)
```

- **X-Achse**: West (−) → Ost (+)
- **Y-Achse**: Unten (0) → Oben (+)
- **Z-Achse**: Süd (−) → Nord (+)
- **Nullpunkt (0,0,0)**: Kreuzung x=0, z=0 (NW-innere Kreuzung)

## Die 16 Quadranten

```
         A (West aussen)  B (Innen West)  C (Innen Ost)  D (Ost aussen)
         x=−100..0        x=0..100        x=100..200     x=200..300

Reihe 1  A1               B1              C1             D1
(Nord)   z=100..0         z=100..0        z=100..0       z=100..0

Reihe 2  A2               B2              C2             D2
(N-Inn)  z=0..−100        z=0..−100       z=0..−100      z=0..−100

Reihe 3  A3               B3              C3             D3
(S-Inn)  z=−100..−200     z=−100..−200    z=−100..−200   z=−100..−200

Reihe 4  A4               B4              C4             D4
(Süd)    z=−200..−300     z=−200..−300    z=−200..−300   z=−200..−300
```

Beispiel: "B2" = Innenblock zwischen x=0 und x=100 (Train Lane),
                  zwischen z=0 (Nordstraße) und z=−100 (Boulevard).

## Straßenraster

| Konstante | Wert | Bedeutung |
|-----------|------|-----------|
| XS        | [0, 100, 200] | NS-Straßen (West→Ost) |
| ZS        | [0, −100, −200] | EW-Straßen (Nord→Süd) |
| RH        | 7 m | Fahrbahnhalbbreite (1 Seite) |
| SW        | 5 m | Gehwegbreite |
| EXT       | 100 m | Außenblock-Tiefe |
| GAP       | RH+SW+1 = 13 m | Gebäudeabstand Standardstraße |
| GAP4      | RH×2+SW+1 = 20 m | Gebäudeabstand Train Lane |
| GL        | 400 m | Straßenlänge (GCZ−GL/2 bis GCZ+GL/2) |
| GCZ       | −100 | Mitte NS-Straßen |

## Ringstraße

| Konstante | Wert |
|-----------|------|
| RING_Z_N  | 100 | Nordring (z=ZS[0]+EXT) |
| RING_Z_S  | −300 | Südring |
| RING_X_W  | −100 | Westseite |
| RING_X_E  | 300 | Ostseite |

## Train Lane (x=100)

- Breite: RH×4 = 28 m (4 Spuren)
- Median: 6 m breiter Mittelstreifen (mSW, segmentiert)
- Gebäude: GAP4 = 20 m Abstand (nsB4-Funktion)
- EW-Gebäude nahe Train Lane: x=68 (West), x=132 (Ost) max

## Qualitätscheckliste (vor jedem Commit)

### Geometrie
- [ ] Keine Gebäude auf Straßen (Train Lane x=86..114 freihalen)
- [ ] EW-Gebäude zwischen x=0 und Train Lane: xMax = x_pos + bw/2 ≤ 81
- [ ] EW-Gebäude zwischen Train Lane und x=200: xMin = x_pos − bw/2 ≥ 119
- [ ] Fluss (z=150) schneidet keine Objekte; Brücke nur für Elevated Rail
- [ ] Median endet vor jeder Kreuzung (nicht über ZS-Kreuzungen)
- [ ] Schiene überquert EW-Straßen mit Brückenbalken (Breite = xw)

### Z-Fighting
- [ ] Coplanare Flächen vermeiden: Stripe-Länge ≠ Body-Länge
- [ ] Fenster: x-Position 0.08 m außerhalb der Karosserie
- [ ] Straßenmarkierungen: y leicht über Straßenoberfläche (y=0.08+)

### Zebra-Streifen
- Streifen verlaufen PARALLEL zur Fahrtrichtung
- horiz=true (N/S-Ansatz): box(stripeW, 0.06, len, ..., cx+off, 0.06, cz)
- horiz=false (E/W-Ansatz): box(len, 0.06, stripeW, ..., cx, 0.06, cz+off)

### Gehwege
- nsSW: endet bei RING_Z_N−RH (Nord) und RING_Z_S+RH (Süd)
- Keine Gehwegecken/Radien an Kreuzungen

### Zug
- Zwei Nasen: front z=−44.4, rear z=+44.4
- Stopp: 5 s, Position auf RAIL_STATION_T=−85 eingerastet
- Beschleunigung quadratisch (immer schneller werdend)
- TRAIN_MAX_SPD=0.18, TRAIN_BRAKE_DIST=100

### Minimap
- N-Pfeil oben, nicht rotierend
- Van-Pfeil rotiert mit Fahrtrichtung

## Häufige Fehler (aus Entwicklungsprotokoll)

1. **Gebäude auf Train Lane**: ewB x=78 → x=68; ewB x=128 mit bw>20 beachten
2. **Zebrastreifen Richtung**: horiz/else-Zweige in zebraCross prüfen
3. **Fluss vs. Ring**: RING_Z_N=100; Fluss muss bei z>110 liegen (jetzt z=150)
4. **Ampeln**: tlAll[] und updateTLLights() NACH allen L-Arm-TL-Erzeugungen aufrufen
5. **EXT-Änderung**: GL und GCZ auto-update; Brückenbreiten prüfen
6. **Corner fills**: NICHT verwenden (sehen falsch aus)
7. **Median**: Segmente nötig, darf nicht über ZS-Kreuzungen gehen
