# digilab.ai News Studio

[App öffnen](https://maicoding.github.io/digilab-news-studio/)

Instagram-Beiträge in 1080 × 1080 und 1080 × 1350 Pixeln gestalten. Die App bietet News-Layouts, Farbvorlagen, Formen, Text-, Logo- und Bildebenen sowie PNG-Export.

## Bedienung

- Ebenen auswählen und in der Vorschau verschieben. Pfeiltasten bewegen die fokussierte Ebene um einen Pixel, Umschalt plus Pfeiltaste um zehn Pixel.
- „Hoch“ setzt eine Ebene nach vorn, „Runter“ nach hinten.
- „Scale“ und „Italic“ wirken auch auf Texte. Gedrehte Auswahlrahmen und erweiterte Typografie folgen der Darstellung.
- Einstellungsbereiche lassen sich einklappen. Auf kleinen Bildschirmen bleibt die Vorschau oberhalb der Einstellungen sichtbar.
- PNG-Export wartet auf alle sichtbaren Bilder und benötigten Schriftdateien. Fehler erscheinen im Exportbereich.

Degular wird über das vorhandene Adobe-Webschriftprojekt geladen. Alternativ können eigene lizenzierte Schriftdateien hochgeladen werden. Benötigte Schnitte: Regular 400, Semibold 600, Bold 700; kursiv Regular oder Bold. Die automatische Schriftwahl verwendet Arial, solange Degular nicht verfügbar ist. Die aktive Schrift ist sichtbar und gilt für Vorschau und Export. Jede gültige hochgeladene OTF-, TTF-, WOFF- oder WOFF2-Datei wird als eigene Schrift angeboten und direkt ausgewählt. Systemschriften sind zusätzlich auswählbar. Der Export wartet auf die gewählte Schrift; fehlende einzelne Schnitte werden über die normale Schriftzuordnung des Browsers dargestellt. Bei vollständig fehlendem Degular ist eine Schriftdatei erforderlich, damit die gewählte Schrift verfügbar ist. Schriftdateien werden nicht ins Repository aufgenommen.

Uploads bleiben im Browser für die aktuelle Sitzung. Ein Neuladen setzt den Entwurf zurück.

## Entwicklung und Veröffentlichung

```sh
npm ci
npm run dev
npm run build
```

GitHub Actions baut bei Änderungen auf `main` und veröffentlicht `dist` auf GitHub Pages. In den Repository-Einstellungen ist als Pages-Quelle „GitHub Actions“ erforderlich. Relative Dateipfade erlauben den Betrieb unter dem Projektpfad und auf Netlify.
