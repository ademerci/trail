# Trail

Ein kleines Top-down-Pixelspiel für den Browser. Du hast eine Million Gold bekommen und dazu eine unsterbliche Schnecke, die dir für immer folgt. Sie ist langsam, weiss aber immer, wo du bist. Wenn sie dich berührt, bist du tot. Am Ende einer Kette von 24 Quests gibt es einen Weg, sie aufzuhalten.

Das ganze Spiel ist eine einzige HTML-Datei (107 KB). Es braucht keine Installation und keine Internetverbindung.

## Wofür dieses Repo ist

Das Repo enthält den Quellcode des Spiels und eine kleine Website, über die man das Spiel herunterladen kann. Aus den Quelldateien in `src/` baut ein Skript die fertige Spieldatei zusammen.

## Spielen

`dist/trail.html` herunterladen und doppelklicken. Das Spiel öffnet sich im Browser und läuft offline. Gespeichert wird automatisch, wenn man schlafen geht, und zwar im Speicher des Browsers, in dem man die Datei geöffnet hat.

Steuerung:

- WASD oder Pfeiltasten: laufen
- Shift: rennen, solange die Ausdauer reicht
- E: reden, Türen öffnen, abbauen, fischen
- 1, 2, 3: Salz, Glas, Eis (nur wenn die Schnecke nah ist)
- 4, 5: Brot essen, Zelt aufstellen
- Q: Journal mit Quests und Inventar
- M: Ton an oder aus

Auf dem Handy erscheinen ein Joystick und Knöpfe auf dem Bildschirm.

## Aufbau

- `src/` enthält den Quellcode, aufgeteilt in Teile: Grundfunktionen, Sprites, Welt, Figuren, Quests, Oberfläche, Aktionen und Spielschleife.
- `web/index.html` ist der Quellcode der Download-Website.
- `build.sh` baut aus `src/` und `web/` alle fertigen Dateien.
- `dist/trail.html` ist das fertige Spiel als eigenständige Datei.
- `site/` ist die fertige Website mit Spiel und Screenshots. Den Ordner kann man so auf GitHub Pages, Netlify oder einen beliebigen Webserver legen.
- `index.html` ist dieselbe Spieldatei ohne Doctype, für die gehostete Version auf Claude.

Neu bauen nach einer Änderung (unter Windows mit Git Bash):

```bash
sh build.sh
```

## Wie das Spiel entstanden ist

Trail ist in einer Session mit Claude Code entstanden, dem KI-Assistenten von Anthropic. Der Ablauf war:

1. Die Idee kam vom bekannten Gedankenexperiment mit der unsterblichen Schnecke und der Million. Daraus wurden im Gespräch der Stil (Pixelgrafik von oben wie in Stardew Valley), das Ziel (Quests erledigen, bis man die Schnecke aufhalten kann) und der Name. "Trail" steht für die Schleimspur und dafür, dass einem jemand auf der Spur ist.
2. Einige Designentscheidungen kamen auch aus dem Gespräch. Die Schnecke geht durch Wasser und über Klippen, nichts hält sie auf. Schlafen ist riskant, weil sie nachts näher kommt. Die Quests probieren die bekannten Lösungen aus dem Meme durch (Salz, Glas, Eis, Meer, Rakete), und alle scheitern.
3. Das Spiel wurde in mehreren Teilen geschrieben (`src/`) und von `build.sh` zu einer Datei zusammengesetzt.
4. Zum Testen hat das Spiel ein Debug-Objekt (`window.__trail`), über das man es Bild für Bild steuern kann. Damit wurde die ganze Hauptquest automatisch durchgespielt, dazu Schlafen, Tod, Shop und Fischen. Dabei wurde ein Absturz bei Fenstergrösse 0 gefunden und behoben.
5. Zum Schluss kamen die Screenshots dazu (aufgenommen mit headless Chrome und Puppeteer) und die Download-Website.

## Technik

- Reines JavaScript mit Canvas 2D. Kein Framework, keine Game-Engine, keine externen Dateien.
- Alle Grafiken sind als Textzeilen im Code gespeichert und werden beim Start in Pixel umgewandelt. Auch die Schrift ist eine eigene 5x7-Pixelschrift.
- Das Spiel rendert in 384x216 Pixeln und wird ohne Glättung hochskaliert.
- Die Welt (100x80 Felder) wird bei jedem Start gleich erzeugt, mit einem festen Zufallswert (Seed). Darin liegen ein Dorf, ein Wald, ein See, Berge mit Schnee, Ruinen und ein Strand mit Steg.
- Musik und Soundeffekte werden mit der Web Audio API im Browser erzeugt. Es gibt keine Audiodateien.
- Der Spielstand liegt im `localStorage` des Browsers.

## Bekannte Einschränkungen

- Die Touch-Steuerung wurde noch nicht auf einem echten Handy getestet.
- Der Spielstand hängt am Browser. Ein privates Fenster oder das Löschen der Websitedaten löscht ihn.
- Die Texte im Spiel sind auf Englisch.
