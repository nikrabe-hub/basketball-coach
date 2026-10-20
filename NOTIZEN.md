# NOTIZEN

Entscheidungen, offene Punkte und bekannte Bugs. Bei neuen Sitzungen zuerst lesen (zusammen mit `PROJEKT_BRIEF.md`).

## Stand

- **Meilenstein 1 (Grundgerüst): Code fertig, in der Cloud getestet.**
- Nächster Schritt: Niklas lädt die APK über GitHub Actions und testet auf dem Handy (Checkliste unten). Danach Plan für Meilenstein 2 (Liga-Generator) und OK abwarten.

## Entscheidungen

- Stack wie im Brief: TypeScript strict, React 19, Vite 8, Vitest 5, Dexie 4, Capacitor 8 (Android). Aktuelle stabile Versionen vom 20.10.2026. TypeScript 7.
- Schlichtes eigenes CSS (kein Tailwind).
- App-ID: `de.niklas.basketballcoach`. Hochformat fest eingestellt.
- Spielstand: ein Datensatz pro Speicherplatz (1–3) in IndexedDB, Tabelle `saves`, Schlüssel `slot`. `version` = `CONFIG.saveVersion`, Migrationen in `src/store/migrations.ts`.
- Navigation hängt an der Browser-History (`src/ui/nav.ts`), damit die Android-Zurück-Taste Dialoge schließt und zum vorherigen Tab zurückgeht. Auf dem Start-Bildschirm beendet sie die App.
- Zufall: nur `Rng` aus `src/engine/rng.ts` (seedbar). `Math.random()` nur in `neuerSeed()`.
- Der Test-Knopf „Saison +1 (Test)“ im Menü-Tab dient nur zur Prüfung des Speicherns. Spätestens in Meilenstein 3 entfernen.
- Web Worker für die Simulation kommt in Meilenstein 3 (noch nichts zu tun).
- Balancing-Skript (10 Saisons ohne UI) kommt in Meilenstein 3. Dafür `tsx` als Dev-Abhängigkeit ergänzen.

## Geprüft (Meilenstein 1)

- `npm test`: 16 Tests grün (Zufallsgenerator, Speicherplätze, Migrationen).
- `npm run build` (inkl. strenger Typprüfung): fehlerfrei.
- Browser-Test mit Handy-Viewport (390×844): Neues Spiel, 5 Tabs, Zurück-Taste, Speichern, Neuladen, Laden, Löschen, keine Konsolenfehler.

## Noch NICHT geprüft

- **Android-APK-Build:** In der Cloud-Umgebung war kein Zugriff auf den Android-SDK-Download möglich. Der Workflow `.github/workflows/build-apk.yml` ist daher ungetestet. Läuft er rot, Fehlermeldung aus GitHub Actions kopieren.
- Verhalten auf einem echten Handy (Zurück-Taste in der APK, Tastatur im Dialog, Spielstand nach App-Neustart).

## Checkliste Handy-Test (Meilenstein 1)

1. APK installiert sich und startet ohne Internet (Flugmodus an).
2. Hauptmenü zeigt 3 leere Plätze. Platz antippen → Dialog, Name eingeben, „Spiel starten“.
3. Die 5 Tabs unten sind gut mit dem Daumen erreichbar, jeder zeigt eine eigene Seite.
4. Menü → „Saison +1 (Test)“ → App komplett schließen (aus der App-Übersicht wegwischen) → neu öffnen → „Weiter spielen“: Saison ist erhalten.
5. Android-Zurück-Taste: schließt den Dialog; wechselt vom Tab „Menü“ zurück zum vorherigen Tab; auf der Startseite verlässt sie die App.
6. Löschen eines Platzes fragt nach und leert ihn.
7. Neue APK über die alte installieren (nach einem weiteren `git push`): Spielstand bleibt erhalten.

## Offene Punkte / Ideen

- App-Icon: aktuell das Standard-Icon von Capacitor. Kommt im Feinschliff (Meilenstein 7).
- Helles Design optional (Meilenstein 7). Akzentfarbe = Teamfarbe ab Meilenstein 2.

## Bekannte Bugs

- Keine bekannt.
