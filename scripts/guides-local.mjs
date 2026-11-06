// Guides written for one language only, for searches that people make in that country.
// Unlike the guides in guides.mjs, these have no versions in the other languages
// (so no hreflang alternates). Search Console showed these German searches already
// bringing visitors: "bild komprimieren", "dateigröße ändern", "formular online ausfüllen kostenlos".
export const LOCAL = [
  {
    id: 'de-bild', lang: 'de', tool: 'compress-image',
    slug: 'bild-komprimieren-fuer-e-mail-und-formulare',
    title: 'Bild komprimieren: Fotos für E-Mail, Bewerbung und Formulare verkleinern · LunaVerta',
    desc: 'Ein Foto ist zu groß für die E-Mail oder das Upload-Formular? So komprimierst du Bilder kostenlos im Browser, siehst die neue Dateigröße vorher und lädst nichts hoch.',
    h1: 'Bild komprimieren: Fotos für E-Mail und Formulare verkleinern',
    lead: 'Handyfotos haben oft 3 bis 8 MB. Für eine E-Mail, eine Bewerbung oder ein Online-Formular reicht meist ein Zehntel davon, ohne dass man einen Unterschied sieht. So geht es in einer Minute.',
    body: [
      { h: 'Schritt für Schritt' },
      { ol: ['Öffne <a href="{tool}">Bild komprimieren</a> und wähle ein oder mehrere Fotos aus. iPhone-Fotos (HEIC) gehen auch.', 'Schieb den Qualitätsregler, bis die angezeigte Dateigröße passt. Bei 75 bis 85 % sieht man auf dem Bildschirm fast nie einen Unterschied.', 'Klicke auf <b>Speichern</b>. Die kleineren Bilder landen auf deinem Gerät, die Originale bleiben unverändert.'] },
      { h: 'Noch zu groß? Auch die Pixel verkleinern' },
      'Die Qualität allein bringt viel, aber bei sehr großen Fotos hilft es, auch die Abmessungen zu verkleinern. Ein Foto mit 4000 Pixeln Breite wird auf einem Bildschirm selten größer als 1600 Pixel gezeigt. Stell dafür unter <b>Einstellungen</b> die <b>Längste Seite</b> auf 2048 oder 1280 px, oder nutze <a href="{t:resize-image}">Bildgröße ändern</a>, um auf Prozent oder genaue Pixel zu verkleinern.',
      { h: 'Wie klein muss es sein?' },
      { ul: ['E-Mail: Viele Postfächer nehmen insgesamt 10 bis 25 MB an. Für mehrere Fotos lohnt es sich, jedes auf unter 1 MB zu bringen.', 'Bewerbungsportale: oft 2 bis 5 MB für alle Anlagen zusammen. Ein Bewerbungsfoto braucht selten mehr als 300 KB.', 'Online-Anträge und Behördenportale: Die Grenze steht meist neben dem Upload-Feld. Bleib lieber etwas darunter.'] },
      { h: 'Standort und Kameradaten verschwinden gleich mit' },
      'Beim Komprimieren wird das Bild neu gezeichnet. Der GPS-Standort, das Handymodell und das Aufnahmedatum werden dabei nicht übernommen. Willst du nur den Standort entfernen, ohne die Qualität zu verändern, nimm <a href="{t:remove-photo-location}">Standort aus Fotos entfernen</a>.',
      { h: 'Werden meine Fotos hochgeladen?' },
      'Nein. Anders als bei den meisten Online-Komprimierern gibt es bei LunaVerta keinen Server, der deine Bilder empfängt. Alles passiert in deinem Browser, und es funktioniert sogar ohne Internet.'
    ]
  },
  {
    id: 'de-groesse', lang: 'de', tool: 'resize-image',
    slug: 'dateigroesse-aendern',
    title: 'Dateigröße ändern: Bilder und PDFs unter 1 MB, 2 MB oder 5 MB bringen · LunaVerta',
    desc: 'Ein Portal erlaubt nur Dateien bis 2 MB? So änderst du die Dateigröße von Fotos und PDFs kostenlos, ohne Programm und ohne die Datei irgendwo hochzuladen.',
    h1: 'Dateigröße ändern: Bilder und PDFs unter die Grenze bringen',
    lead: '„Die Datei ist zu groß.“ Diese Meldung kommt bei Bewerbungsportalen, Online-Anträgen und Kontaktformularen ständig. Je nachdem, ob es ein Foto oder ein PDF ist, gibt es einen schnellen Weg unter die Grenze.',
    body: [
      { h: 'Ein Foto oder Bild kleiner machen' },
      { ol: ['Öffne <a href="{t:compress-image}">Bild komprimieren</a> und wähle das Bild aus.', 'Senke die Qualität, bis die angezeigte neue Dateigröße unter der Grenze liegt.', 'Reicht das nicht, verkleinere zusätzlich die Abmessungen mit <a href="{tool}">Bildgröße ändern</a>, zum Beispiel auf 50 %. Halb so breit heißt ungefähr ein Viertel der Dateigröße.', 'Klicke auf <b>Speichern</b> und lade die neue Datei hoch.'] },
      { h: 'Ein PDF kleiner machen' },
      'Öffne <a href="{t:compress-pdf}">PDF komprimieren</a>. Gescannte Seiten und eingefügte Fotos werden kompakter gespeichert, der Text bleibt durchsuchbar. Ein farbiger Scan von schwarzem Text wird mit <a href="{t:greyscale-pdf}">PDF in Graustufen</a> oft noch einmal deutlich kleiner.',
      { h: 'Immer noch zu groß? Aufteilen' },
      'Viele Portale erlauben mehrere Dateien, aber jede nur bis zu einer bestimmten Größe. Mit <a href="{t:split-pdf}">PDF teilen</a> und der Option <b>Teile klein genug für E-Mail</b> gibst du die Grenze in MB ein, und jeder Teil bleibt darunter.',
      { h: 'Das falsche Format ist auch ein häufiger Grund' },
      { ul: ['Portal nimmt nur JPG? <a href="{t:png-to-jpg}">PNG in JPG</a> oder <a href="{t:heic-to-jpg}">HEIC in JPG</a> für iPhone-Fotos.', 'Portal nimmt nur PDF? Fotos werden mit <a href="{t:images-to-pdf}">JPG in PDF</a> zu einem PDF, Word-Dateien mit <a href="{t:word-to-pdf}">Word in PDF</a>.'] },
      { h: 'Ohne Upload, ohne Konto' },
      'Ausweiskopien, Zeugnisse und Gehaltsabrechnungen gehören nicht auf fremde Server. Bei LunaVerta wird nichts hochgeladen: Die Datei wird in deinem Browser verkleinert und direkt auf deinem Gerät gespeichert.'
    ]
  },
  {
    id: 'de-formular', lang: 'de', tool: 'fill-pdf-form',
    slug: 'pdf-formular-online-ausfuellen-kostenlos',
    title: 'PDF-Formular online ausfüllen, kostenlos und ohne Adobe · LunaVerta',
    desc: 'Anträge und Formulare als PDF am Computer oder Handy ausfüllen, unterschreiben und speichern. Kostenlos, ohne Anmeldung und ohne Upload. So geht es.',
    h1: 'PDF-Formular online ausfüllen, kostenlos und ohne Adobe',
    lead: 'Viele Anträge, Vollmachten und Anmeldungen gibt es als PDF. Statt sie auszudrucken, mit der Hand auszufüllen und wieder einzuscannen, kannst du sie direkt im Browser ausfüllen und unterschreiben.',
    body: [
      { h: 'Schritt für Schritt' },
      { ol: ['Öffne <a href="{tool}">PDF-Formular ausfüllen</a> und wähle das Formular aus.', 'Klicke in die Felder und tippe. Kästchen kreuzt du mit einem Klick an, Auswahllisten klappst du auf.', 'Muss unterschrieben werden? Klicke auf <b>Unterschrift</b>, unterschreibe mit Finger oder Maus und setze sie an die richtige Stelle.', 'Klicke auf <b>PDF speichern</b>. Das ausgefüllte Formular wird auf deinem Gerät gespeichert und bleibt ausfüllbar.'] },
      { h: 'Das Formular hat keine Felder?' },
      'Manche PDFs sind nur eingescannte Papierformulare ohne ausfüllbare Felder. Dann wählst du im Editor <b>Text hinzufügen</b> und klickst einfach dorthin, wo etwas stehen soll. Schriftgröße und Position kannst du anpassen, bis es auf der Linie sitzt.',
      { h: 'Typische Formulare' },
      { ul: ['Anträge von Behörden, Familienkasse, Krankenkasse und Versicherungen, die als PDF zum Herunterladen angeboten werden', 'Vollmachten, Kündigungen und Einverständniserklärungen', 'Anmeldungen für Schule, Kita, Verein und Kurse', 'Mietverträge und Übergabeprotokolle'] },
      { h: 'Selbst ein ausfüllbares Formular machen' },
      'Du brauchst andersherum ein Formular, das andere ausfüllen sollen? Mit <a href="{t:make-fillable-pdf}">Ausfüllbares PDF erstellen</a> fügst du Textfelder und Kontrollkästchen zu jedem PDF hinzu.',
      { h: 'Bleiben meine Angaben privat?' },
      'Ja. Formulare enthalten oft Steuer-ID, Geburtsdatum und Bankverbindung. Bei LunaVerta wird das PDF nicht hochgeladen, sondern in deinem Browser ausgefüllt und gespeichert. Es gibt kein Konto und keine Werbung, und es funktioniert auch offline.'
    ]
  }
];
