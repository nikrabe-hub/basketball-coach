# Basketball Coach

Offline-Basketball-Coach-Spiel (fiktive Profiliga) für dein Android-Handy.
Web-App (TypeScript, React, Vite), verpackt mit Capacitor als APK.
Den Spielumfang beschreibt `PROJEKT_BRIEF.md`, den aktuellen Stand `NOTIZEN.md`.

**Stand: Meilenstein 1 (Grundgerüst).** Es gibt 3 Speicherplätze, die 5 Tabs (noch mit Platzhaltern) und den APK-Build.

---

## Einmalige Vorbereitung auf deinem Windows-PC

### 1. Node.js installieren
1. Öffne https://nodejs.org und lade die **LTS-Version** herunter (Version 22 oder neuer).
2. Starte das Installationsprogramm und klicke dich mit den Standardeinstellungen durch.
3. Öffne ein neues **PowerShell**-Fenster (Windows-Taste, „PowerShell“ eintippen) und prüfe:
   ```
   node -v
   npm -v
   ```
   Beide Befehle müssen eine Versionsnummer anzeigen.

### 2. Git installieren
1. Lade https://git-scm.com/download/win herunter und installiere es mit den Standardeinstellungen.
2. Prüfe in einem **neuen** PowerShell-Fenster: `git --version`

### 3. Projekt-Abhängigkeiten installieren
Öffne PowerShell **im Projektordner** (im Explorer in den Ordner gehen, in die Adresszeile `powershell` tippen, Enter) und führe aus:
```
npm install
```
Das dauert ein bis zwei Minuten.

---

## Schnell testen: im Handy-Browser (WLAN)

1. Handy und PC müssen im **selben WLAN** sein.
2. Im Projektordner in PowerShell:
   ```
   npm run dev
   ```
   Du siehst Zeilen wie `Network: http://192.168.178.20:5173/`. Das ist die Adresse für dein Handy.
3. Öffne diese Adresse im Browser deines Handys (Chrome).
4. **Falls es nicht lädt:** Die Windows-Firewall blockiert wahrscheinlich Node.js.
   - Beim ersten Start fragt Windows meist „Zugriff zulassen?“ – dann **„Private Netzwerke“** anhaken und bestätigen.
   - Sonst: Windows-Taste → „Firewall“ → „App durch die Windows Defender Firewall zulassen“ → „Einstellungen ändern“ → „Andere App zulassen…“ → `node.exe` (meist `C:\Program Files\nodejs\node.exe`) auswählen → bei **Privat** ein Häkchen setzen.
   - Ist dein WLAN als „Öffentlich“ eingestuft: Einstellungen → Netzwerk & Internet → WLAN → dein Netzwerk → „Privat“ wählen.
5. Beenden mit `Strg + C` im PowerShell-Fenster.

Der Browser-Test ist nur für schnelle Versuche. Gespeichert wird im Browser-Speicher des Handys, nicht in der APK.

---

## Echte APK bauen lassen (GitHub Actions)

Du brauchst dafür kein Android Studio. GitHub baut die APK für dich.

### 1. Privates Repository anlegen
1. Auf https://github.com einloggen → oben rechts **„+“ → „New repository“**.
2. Name z. B. `basketball-coach`, Sichtbarkeit **Private**.
3. **Keine** README, .gitignore oder Lizenz hinzufügen (Haken weglassen) → „Create repository“.

### 2. Projekt hochladen
Im Projektordner in PowerShell (die Adresse `DEIN-NAME` ersetzt du durch deinen GitHub-Namen):
```
git remote add origin https://github.com/DEIN-NAME/basketball-coach.git
git push -u origin main
```
Beim ersten Mal öffnet sich ein Fenster zur Anmeldung bei GitHub. Melde dich dort an.
(Falls `git commit` oder `git push` meldet „Please tell me who you are“, einmalig ausführen:
`git config --global user.name "Dein Name"` und `git config --global user.email "deine@mail.de"`.)

### 3. APK herunterladen
1. Auf GitHub dein Repository öffnen → Reiter **Actions**.
2. Der Lauf „Debug-APK bauen“ startet automatisch und dauert ca. 5–10 Minuten. Grüner Haken = fertig.
   (Rotes Kreuz? Klick auf den Lauf, kopiere mir die Fehlermeldung, dann behebe ich es.)
3. Klicke auf den fertigen Lauf, scrolle nach unten zu **Artifacts** und lade `basketball-coach-debug-apk` herunter. Das ist eine ZIP-Datei, entpacke sie. Darin liegt `app-debug.apk`.

### 4. APK auf dem Handy installieren
1. Bringe `app-debug.apk` auf dein Handy (USB-Kabel, Google Drive, E-Mail an dich selbst oder Lade-Link direkt im Handy-Browser von GitHub).
2. Tippe die Datei auf dem Handy an (über die App „Dateien“ oder „Downloads“).
3. Android fragt nach **„Installation aus unbekannten Quellen“**: Tippe auf **Einstellungen** und erlaube es für genau die App, mit der du die Datei geöffnet hast (z. B. Chrome oder Dateien). Gehe zurück und tippe erneut auf **Installieren**.
4. Falls „Play Protect“ warnt: **„Trotzdem installieren“**. Die APK stammt ja von dir selbst.
5. Die App heißt **Basketball Coach** und läuft ohne Internet.

Bei jedem weiteren `git push` baut GitHub automatisch eine neue APK. Du kannst sie einfach über die alte drüberinstallieren, die Spielstände bleiben dabei erhalten.

---

## Befehle im Überblick

| Befehl | Was er macht |
| --- | --- |
| `npm run dev` | Entwicklungsserver für den Handy-Browser-Test |
| `npm test` | Tests der Spiel-Engine und des Speichersystems |
| `npm run build` | Prüft den Code und baut die Web-App nach `dist/` |
| `npm run cap:sync` | Kopiert die Web-App in das Android-Projekt (macht GitHub Actions selbst) |

## Ordnerstruktur

```
src/engine/   Spielregeln, Simulation, Daten-Modelle, Konfig (ohne UI)
src/store/    Speichern/Laden (IndexedDB über Dexie), Migrationen
src/ui/       Bildschirme und Design
android/      Android-Projekt (von Capacitor erzeugt)
.github/      Workflow, der die APK baut
```

Alle Balancing-Zahlen stehen in `src/engine/config.ts`.
