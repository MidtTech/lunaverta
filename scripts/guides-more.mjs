// Two more guides, in every language: a PDF too big for an upload form, and scanned pages into one PDF.
// Merged into GUIDES (guides.mjs, en/da) and GUIDE_TEXT (guides-extra.mjs, the other languages).
export const MORE = [
  {
    id: 'upload', tool: 'compress-pdf',
    en: {
      slug: 'pdf-too-big-to-upload', title: 'PDF too big to upload to a form or portal? Make it fit · LunaVerta',
      desc: 'Government portals, job sites and insurance forms often refuse files over a few MB. Make the PDF smaller or split it, free, without uploading it anywhere first.',
      h1: 'PDF too big to upload? Make it fit the limit', lead: 'Government portals, job sites and insurance claims often refuse files over a few megabytes, and the error message rarely helps. Here is how to get under the limit.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Compress PDF</a> and choose the PDF.', 'Every page is redrawn more compactly. The text stays searchable.', 'You see how much smaller it became. Click <b>Save</b> and try the upload again.'] },
        { h: 'Still too big? Split it' },
        'Open <a href="{t:split-pdf}">Split PDF</a> and choose <b>Parts small enough for e-mail</b>. Type the portal\'s limit in MB, and LunaVerta makes parts that each stay under it. Most forms let you add several files.',
        { h: 'Scans and photos are the usual culprits' },
        { ul: ['A colour scan of black text can become much smaller in <a href="{t:greyscale-pdf}">greyscale</a>.', 'Photos of paper taken with a phone are big. <a href="{t:scan-to-pdf}">Scan to PDF</a> straightens them and makes one compact PDF.'] },
        { h: 'Check the format too' },
        'Many portals only accept PDF. Turn Word documents into PDF with <a href="{t:word-to-pdf}">Word to PDF</a> and photos into PDF with <a href="{t:images-to-pdf}">JPG to PDF</a>.'
      ]
    },
    da: {
      slug: 'pdf-for-stor-til-upload', title: 'PDF for stor til Digital Post eller en selvbetjening? Få den under grænsen · LunaVerta',
      desc: 'Digital Post, kommunens selvbetjening, jobsider og forsikringer afviser ofte filer over få MB. Gør PDF\'en mindre eller del den, gratis og uden at uploade den først.',
      h1: 'PDF for stor til at uploade? Få den under grænsen', lead: 'Digital Post, kommunens selvbetjeningsløsninger, jobsider og forsikringsanmeldelser afviser ofte filer over få megabyte, og fejlbeskeden hjælper sjældent. Sådan kommer du under grænsen.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Komprimér PDF</a> og vælg PDF\'en.', 'Hver side tegnes mere kompakt. Teksten kan stadig søges i.', 'Du ser, hvor meget mindre den blev. Klik på <b>Gem</b> og prøv at uploade igen.'] },
        { h: 'Stadig for stor? Del den' },
        'Åbn <a href="{t:split-pdf}">Del PDF</a> og vælg <b>Dele små nok til mail</b>. Skriv grænsen i MB, så laver LunaVerta dele, der hver holder sig under den. De fleste formularer lader dig vedhæfte flere filer.',
        { h: 'Scanninger og fotos er de typiske syndere' },
        { ul: ['En farvescanning af sort tekst bliver ofte meget mindre i <a href="{t:greyscale-pdf}">gråtoner</a>.', 'Billeder af papir taget med telefonen fylder meget. <a href="{t:scan-to-pdf}">Scan til PDF</a> retter dem op og laver én kompakt PDF.'] },
        { h: 'Tjek også formatet' },
        'Mange løsninger tager kun imod PDF. Lav Word-dokumenter om til PDF med <a href="{t:word-to-pdf}">Word til PDF</a> og billeder med <a href="{t:images-to-pdf}">JPG til PDF</a>.'
      ]
    },
    sv: {
      slug: 'pdf-for-stor-for-uppladdning', title: 'PDF för stor för att ladda upp i en e-tjänst? Få den under gränsen · LunaVerta',
      desc: 'Myndigheters e-tjänster, jobbsajter och försäkringsbolag nekar ofta filer över några MB. Gör PDF:en mindre eller dela den, gratis och utan att ladda upp den först.',
      h1: 'PDF för stor för att ladda upp? Få den under gränsen', lead: 'Myndigheters e-tjänster, jobbsajter och skadeanmälningar nekar ofta filer över några megabyte, och felmeddelandet hjälper sällan. Så kommer du under gränsen.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Komprimera PDF</a> och välj PDF:en.', 'Varje sida ritas om mer kompakt. Texten går fortfarande att söka i.', 'Du ser hur mycket mindre den blev. Klicka på <b>Spara</b> och försök ladda upp igen.'] },
        { h: 'Fortfarande för stor? Dela den' },
        'Öppna <a href="{t:split-pdf}">Dela PDF</a> och välj <b>Delar små nog för e-post</b>. Skriv gränsen i MB, så gör LunaVerta delar som var och en håller sig under den. De flesta formulär låter dig bifoga flera filer.',
        { h: 'Skanningar och foton är de vanliga bovarna' },
        { ul: ['En färgskanning av svart text blir ofta mycket mindre i <a href="{t:greyscale-pdf}">gråskala</a>.', 'Foton av papper tagna med mobilen är stora. <a href="{t:scan-to-pdf}">Skanna till PDF</a> rätar upp dem och gör en kompakt PDF.'] },
        { h: 'Kontrollera formatet också' },
        'Många e-tjänster tar bara emot PDF. Gör om Word-dokument till PDF med <a href="{t:word-to-pdf}">Word till PDF</a> och foton med <a href="{t:images-to-pdf}">JPG till PDF</a>.'
      ]
    },
    no: {
      slug: 'pdf-for-stor-til-opplasting', title: 'PDF for stor til å laste opp i Altinn, NAV eller et skjema? Få den under grensen · LunaVerta',
      desc: 'Offentlige skjemaer, jobbsider og forsikringsselskaper avviser ofte filer over noen få MB. Gjør PDF-en mindre eller del den, gratis og uten å laste den opp først.',
      h1: 'PDF for stor til å laste opp? Få den under grensen', lead: 'Altinn, NAV, jobbsider og skademeldinger avviser ofte filer over noen få megabyte, og feilmeldingen hjelper sjelden. Slik kommer du under grensen.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Komprimer PDF</a> og velg PDF-en.', 'Hver side tegnes mer kompakt. Teksten er fortsatt søkbar.', 'Du ser hvor mye mindre den ble. Klikk på <b>Lagre</b> og prøv å laste opp igjen.'] },
        { h: 'Fortsatt for stor? Del den' },
        'Åpne <a href="{t:split-pdf}">Del opp PDF</a> og velg <b>Deler små nok for e-post</b>. Skriv inn grensen i MB, så lager LunaVerta deler som hver holder seg under den. De fleste skjemaer lar deg legge ved flere filer.',
        { h: 'Skanninger og bilder er de vanlige synderne' },
        { ul: ['En fargeskanning av svart tekst blir ofte mye mindre i <a href="{t:greyscale-pdf}">gråtoner</a>.', 'Bilder av papir tatt med mobilen er store. <a href="{t:scan-to-pdf}">Skann til PDF</a> retter dem opp og lager én kompakt PDF.'] },
        { h: 'Sjekk formatet også' },
        'Mange løsninger tar bare imot PDF. Gjør Word-dokumenter om til PDF med <a href="{t:word-to-pdf}">Word til PDF</a> og bilder med <a href="{t:images-to-pdf}">JPG til PDF</a>.'
      ]
    },
    de: {
      slug: 'pdf-zu-gross-zum-hochladen', title: 'PDF zu groß zum Hochladen im Behördenportal oder Formular? So passt sie · LunaVerta',
      desc: 'Behördenportale, Bewerbungsportale und Versicherungen lehnen Dateien über wenige MB oft ab. Mach das PDF kleiner oder teil es, kostenlos und ohne es vorher hochzuladen.',
      h1: 'PDF zu groß zum Hochladen? So bleibt es unter dem Limit', lead: 'Behördenportale, Bewerbungsportale und Schadensmeldungen lehnen Dateien über wenige Megabyte oft ab, und die Fehlermeldung hilft selten. So kommst du unter das Limit.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF komprimieren</a> und wähle das PDF.', 'Jede Seite wird kompakter neu gezeichnet. Der Text bleibt durchsuchbar.', 'Du siehst, wie viel kleiner es geworden ist. Klicke auf <b>Speichern</b> und lade es erneut hoch.'] },
        { h: 'Immer noch zu groß? Teil es' },
        'Öffne <a href="{t:split-pdf}">PDF teilen</a> und wähle <b>Teile klein genug für E-Mail</b>. Gib das Limit des Portals in MB ein, dann macht LunaVerta Teile, die jeweils darunter bleiben. Die meisten Formulare erlauben mehrere Dateien.',
        { h: 'Scans und Fotos sind die üblichen Verdächtigen' },
        { ul: ['Ein Farbscan von schwarzem Text wird in <a href="{t:greyscale-pdf}">Graustufen</a> oft viel kleiner.', 'Handyfotos von Papier sind groß. <a href="{t:scan-to-pdf}">Dokument scannen</a> begradigt sie und macht ein kompaktes PDF daraus.'] },
        { h: 'Prüf auch das Format' },
        'Viele Portale nehmen nur PDF an. Wandle Word-Dokumente mit <a href="{t:word-to-pdf}">Word in PDF</a> um und Fotos mit <a href="{t:images-to-pdf}">JPG in PDF</a>.'
      ]
    },
    es: {
      slug: 'pdf-demasiado-grande-para-subir', title: '¿PDF demasiado grande para la sede electrónica o un formulario? Hazlo caber · LunaVerta',
      desc: 'Las sedes electrónicas, los portales de empleo y las aseguradoras suelen rechazar archivos de más de unos pocos MB. Reduce el PDF o divídelo, gratis y sin subirlo antes a ningún sitio.',
      h1: '¿PDF demasiado grande para subirlo? Déjalo por debajo del límite', lead: 'Las sedes electrónicas de la administración, los portales de empleo y los partes al seguro suelen rechazar archivos de más de unos pocos megabytes, y el mensaje de error rara vez ayuda. Así te quedas por debajo del límite.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Comprimir PDF</a> y elige el PDF.', 'Cada página se vuelve a dibujar de forma más compacta. El texto se puede seguir buscando.', 'Ves cuánto más pequeño ha quedado. Haz clic en <b>Guardar</b> y vuelve a intentar subirlo.'] },
        { h: '¿Sigue siendo demasiado grande? Divídelo' },
        'Abre <a href="{t:split-pdf}">Dividir PDF</a> y elige <b>Partes lo bastante pequeñas para el correo</b>. Escribe el límite del portal en MB y LunaVerta crea partes que quedan por debajo. La mayoría de formularios permiten adjuntar varios archivos.',
        { h: 'Los escaneos y las fotos suelen ser el problema' },
        { ul: ['Un escaneo en color de texto negro suele quedar mucho más pequeño en <a href="{t:greyscale-pdf}">escala de grises</a>.', 'Las fotos de papeles hechas con el móvil ocupan mucho. <a href="{t:scan-to-pdf}">Escanear a PDF</a> las endereza y crea un PDF compacto.'] },
        { h: 'Comprueba también el formato' },
        'Muchos portales solo aceptan PDF. Convierte documentos de Word con <a href="{t:word-to-pdf}">Word a PDF</a> y fotos con <a href="{t:images-to-pdf}">JPG a PDF</a>.'
      ]
    },
    fr: {
      slug: 'pdf-trop-lourd-pour-envoyer', title: 'PDF trop lourd pour une démarche en ligne ou un formulaire ? Faites-le passer · LunaVerta',
      desc: 'Les démarches en ligne, les sites d\'emploi et les assurances refusent souvent les fichiers de plus de quelques Mo. Allégez le PDF ou divisez-le, gratuitement et sans l\'envoyer nulle part avant.',
      h1: 'PDF trop lourd pour être envoyé ? Passez sous la limite', lead: 'Les démarches administratives en ligne, les sites d\'emploi et les déclarations de sinistre refusent souvent les fichiers de plus de quelques mégaoctets, et le message d\'erreur aide rarement. Voici comment passer sous la limite.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Compresser PDF</a> et choisissez le PDF.', 'Chaque page est redessinée de façon plus compacte. Le texte reste consultable.', 'Vous voyez de combien il a été allégé. Cliquez sur <b>Enregistrer</b> et réessayez l\'envoi.'] },
        { h: 'Toujours trop lourd ? Divisez-le' },
        'Ouvrez <a href="{t:split-pdf}">Diviser PDF</a> et choisissez <b>Parties assez légères pour l\'e-mail</b>. Indiquez la limite du site en Mo, et LunaVerta crée des parties qui restent chacune en dessous. La plupart des formulaires acceptent plusieurs fichiers.',
        { h: 'Les scans et les photos sont les suspects habituels' },
        { ul: ['Un scan couleur de texte noir devient souvent bien plus léger en <a href="{t:greyscale-pdf}">niveaux de gris</a>.', 'Les photos de papiers prises au téléphone sont lourdes. <a href="{t:scan-to-pdf}">Scanner en PDF</a> les redresse et crée un PDF compact.'] },
        { h: 'Vérifiez aussi le format' },
        'Beaucoup de sites n\'acceptent que le PDF. Convertissez les documents Word avec <a href="{t:word-to-pdf}">Word en PDF</a> et les photos avec <a href="{t:images-to-pdf}">JPG en PDF</a>.'
      ]
    }
  },
  {
    id: 'scans', tool: 'merge-pdf',
    en: {
      slug: 'combine-scanned-pages-into-one-pdf', title: 'Combine scanned pages into one PDF, in the right order · LunaVerta',
      desc: 'Got a scan per page, or the fronts and backs as two files? Put them together into one PDF in the right order, remove empty pages and make the text searchable. Free and private.',
      h1: 'Combine scanned pages into one PDF', lead: 'Scanners and phone apps often give you one file per page, or all the fronts and then all the backs. Here is how to end up with one tidy PDF, in the right order.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Merge PDF</a> and choose all the scanned files at once. Pictures (JPG, PNG, HEIC) work too.', 'Drag the files into the right order.', 'Click <b>Merge</b> and save the combined PDF.'] },
        { h: 'Fronts and backs scanned as two stacks?' },
        'Use <a href="{t:alternate-merge-pdf}">Alternate merge</a>: choose the file with the fronts, then the one with the backs, and LunaVerta puts them together page by page, even when the backs are in reverse order.',
        { h: 'Tidy it up' },
        { ul: ['Double-sided scans are full of empty backs. <a href="{t:remove-blank-pages}">Remove blank pages</a> takes them out.', 'Make the text searchable and copyable with <a href="{t:ocr}">OCR</a>.', 'Too big to send? Use <a href="{compress}">Compress PDF</a>.'] },
        { h: 'Only paper?' },
        'Take photos with your phone in <a href="{t:scan-to-pdf}">Scan to PDF</a>. The pages are straightened and become one PDF straight away.'
      ]
    },
    da: {
      slug: 'saml-scannede-sider-i-en-pdf', title: 'Saml scannede sider i én PDF, i den rigtige rækkefølge · LunaVerta',
      desc: 'Har du én scanning pr. side, eller forsider og bagsider som to filer? Saml dem i én PDF i den rigtige rækkefølge, fjern tomme sider og gør teksten søgbar. Gratis og privat.',
      h1: 'Saml scannede sider i én PDF', lead: 'Scannere og telefon-apps giver ofte én fil pr. side, eller alle forsider og derefter alle bagsider. Sådan ender du med én pæn PDF i den rigtige rækkefølge.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Saml PDF</a> og vælg alle de scannede filer på én gang. Billeder (JPG, PNG, HEIC) virker også.', 'Træk filerne i den rigtige rækkefølge.', 'Klik på <b>Saml</b> og gem den samlede PDF.'] },
        { h: 'Forsider og bagsider scannet som to bunker?' },
        'Brug <a href="{t:alternate-merge-pdf}">Flet forsider og bagsider</a>: vælg filen med forsiderne og derefter den med bagsiderne, så sætter LunaVerta dem sammen side for side, også når bagsiderne er i omvendt rækkefølge.',
        { h: 'Ryd op' },
        { ul: ['Tosidede scanninger er fulde af tomme bagsider. <a href="{t:remove-blank-pages}">Fjern tomme sider</a> tager dem ud.', 'Gør teksten søgbar og kopierbar med <a href="{t:ocr}">OCR</a>.', 'For stor til at sende? Brug <a href="{compress}">Komprimér PDF</a>.'] },
        { h: 'Kun papir?' },
        'Tag billeder med telefonen i <a href="{t:scan-to-pdf}">Scan til PDF</a>. Siderne rettes op og bliver til én PDF med det samme.'
      ]
    },
    sv: {
      slug: 'sla-ihop-skannade-sidor-till-en-pdf', title: 'Slå ihop skannade sidor till en PDF, i rätt ordning · LunaVerta',
      desc: 'Har du en skanning per sida, eller fram- och baksidor som två filer? Slå ihop dem till en PDF i rätt ordning, ta bort tomma sidor och gör texten sökbar. Gratis och privat.',
      h1: 'Slå ihop skannade sidor till en PDF', lead: 'Skannrar och mobilappar ger ofta en fil per sida, eller alla framsidor och sedan alla baksidor. Så får du en snygg PDF i rätt ordning.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Slå ihop PDF</a> och välj alla skannade filer på en gång. Bilder (JPG, PNG, HEIC) fungerar också.', 'Dra filerna i rätt ordning.', 'Klicka på <b>Slå ihop</b> och spara den sammanslagna PDF:en.'] },
        { h: 'Fram- och baksidor skannade som två högar?' },
        'Använd <a href="{t:alternate-merge-pdf}">Varva PDF-sidor</a>: välj filen med framsidorna och sedan den med baksidorna, så sätter LunaVerta ihop dem sida för sida, även när baksidorna ligger i omvänd ordning.',
        { h: 'Städa upp' },
        { ul: ['Dubbelsidiga skanningar är fulla av tomma baksidor. <a href="{t:remove-blank-pages}">Ta bort tomma sidor</a> plockar bort dem.', 'Gör texten sökbar och kopierbar med <a href="{t:ocr}">OCR</a>.', 'För stor att skicka? Använd <a href="{compress}">Komprimera PDF</a>.'] },
        { h: 'Bara papper?' },
        'Fota med mobilen i <a href="{t:scan-to-pdf}">Skanna till PDF</a>. Sidorna rätas upp och blir en PDF direkt.'
      ]
    },
    no: {
      slug: 'sla-sammen-skannede-sider-til-en-pdf', title: 'Slå sammen skannede sider til én PDF, i riktig rekkefølge · LunaVerta',
      desc: 'Har du én skanning per side, eller forsider og baksider som to filer? Slå dem sammen til én PDF i riktig rekkefølge, fjern tomme sider og gjør teksten søkbar. Gratis og privat.',
      h1: 'Slå sammen skannede sider til én PDF', lead: 'Skannere og mobilapper gir ofte én fil per side, eller alle forsidene og så alle baksidene. Slik ender du med én ryddig PDF i riktig rekkefølge.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Slå sammen PDF</a> og velg alle de skannede filene på én gang. Bilder (JPG, PNG, HEIC) fungerer også.', 'Dra filene i riktig rekkefølge.', 'Klikk på <b>Slå sammen</b> og lagre den sammenslåtte PDF-en.'] },
        { h: 'Forsider og baksider skannet som to bunker?' },
        'Bruk <a href="{t:alternate-merge-pdf}">Flett PDF-sider</a>: velg filen med forsidene og så den med baksidene, så setter LunaVerta dem sammen side for side, også når baksidene er i omvendt rekkefølge.',
        { h: 'Rydd opp' },
        { ul: ['Tosidige skanninger er fulle av tomme baksider. <a href="{t:remove-blank-pages}">Fjern tomme sider</a> tar dem bort.', 'Gjør teksten søkbar og kopierbar med <a href="{t:ocr}">OCR</a>.', 'For stor til å sende? Bruk <a href="{compress}">Komprimer PDF</a>.'] },
        { h: 'Bare papir?' },
        'Ta bilder med mobilen i <a href="{t:scan-to-pdf}">Skann til PDF</a>. Sidene rettes opp og blir én PDF med en gang.'
      ]
    },
    de: {
      slug: 'gescannte-seiten-zu-einem-pdf', title: 'Gescannte Seiten zu einem PDF zusammenfügen, in der richtigen Reihenfolge · LunaVerta',
      desc: 'Ein Scan pro Seite, oder Vorder- und Rückseiten als zwei Dateien? Füg sie zu einem PDF in der richtigen Reihenfolge zusammen, entferne leere Seiten und mach den Text durchsuchbar. Kostenlos und privat.',
      h1: 'Gescannte Seiten zu einem PDF zusammenfügen', lead: 'Scanner und Handy-Apps liefern oft eine Datei pro Seite, oder erst alle Vorderseiten und dann alle Rückseiten. So bekommst du ein ordentliches PDF in der richtigen Reihenfolge.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF zusammenfügen</a> und wähle alle gescannten Dateien auf einmal. Bilder (JPG, PNG, HEIC) gehen auch.', 'Zieh die Dateien in die richtige Reihenfolge.', 'Klicke auf <b>Zusammenfügen</b> und speichere das PDF.'] },
        { h: 'Vorder- und Rückseiten als zwei Stapel gescannt?' },
        'Nutze <a href="{t:alternate-merge-pdf}">PDF-Seiten abwechselnd mischen</a>: wähl die Datei mit den Vorderseiten, dann die mit den Rückseiten, und LunaVerta fügt sie Seite für Seite zusammen, auch wenn die Rückseiten umgekehrt sind.',
        { h: 'Aufräumen' },
        { ul: ['Doppelseitige Scans sind voller leerer Rückseiten. <a href="{t:remove-blank-pages}">Leere Seiten entfernen</a> nimmt sie heraus.', 'Mach den Text mit <a href="{t:ocr}">OCR</a> durchsuchbar und kopierbar.', 'Zu groß zum Verschicken? Nutze <a href="{compress}">PDF komprimieren</a>.'] },
        { h: 'Nur Papier?' },
        'Fotografier die Seiten mit dem Handy in <a href="{t:scan-to-pdf}">Dokument scannen</a>. Sie werden begradigt und sofort zu einem PDF.'
      ]
    },
    es: {
      slug: 'unir-paginas-escaneadas-en-un-pdf', title: 'Unir páginas escaneadas en un solo PDF, en el orden correcto · LunaVerta',
      desc: '¿Tienes un escaneo por página, o los anversos y reversos en dos archivos? Únelos en un PDF en el orden correcto, quita las páginas en blanco y haz el texto buscable. Gratis y privado.',
      h1: 'Unir páginas escaneadas en un solo PDF', lead: 'Los escáneres y las apps del móvil suelen dar un archivo por página, o todos los anversos y luego todos los reversos. Así acabas con un PDF ordenado.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Unir PDF</a> y elige todos los archivos escaneados a la vez. Las imágenes (JPG, PNG, HEIC) también sirven.', 'Arrastra los archivos al orden correcto.', 'Haz clic en <b>Unir</b> y guarda el PDF combinado.'] },
        { h: '¿Anversos y reversos escaneados en dos montones?' },
        'Usa <a href="{t:alternate-merge-pdf}">Unir alternando</a>: elige el archivo de los anversos y luego el de los reversos, y LunaVerta los junta página a página, incluso si los reversos vienen al revés.',
        { h: 'Pon orden' },
        { ul: ['Los escaneos a doble cara están llenos de reversos vacíos. <a href="{t:remove-blank-pages}">Quitar páginas en blanco</a> los elimina.', 'Haz el texto buscable y copiable con <a href="{t:ocr}">OCR</a>.', '¿Demasiado grande para enviarlo? Usa <a href="{compress}">Comprimir PDF</a>.'] },
        { h: '¿Solo tienes papel?' },
        'Haz fotos con el móvil en <a href="{t:scan-to-pdf}">Escanear a PDF</a>. Las páginas se enderezan y se convierten en un PDF al momento.'
      ]
    },
    fr: {
      slug: 'reunir-pages-scannees-en-un-pdf', title: 'Réunir des pages scannées en un seul PDF, dans le bon ordre · LunaVerta',
      desc: 'Un scan par page, ou les rectos et les versos en deux fichiers ? Réunissez-les en un PDF dans le bon ordre, retirez les pages blanches et rendez le texte consultable. Gratuit et privé.',
      h1: 'Réunir des pages scannées en un seul PDF', lead: 'Les scanners et les applis mobiles donnent souvent un fichier par page, ou tous les rectos puis tous les versos. Voici comment obtenir un PDF propre, dans le bon ordre.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Fusionner PDF</a> et choisissez tous les fichiers scannés d\'un coup. Les images (JPG, PNG, HEIC) fonctionnent aussi.', 'Faites glisser les fichiers dans le bon ordre.', 'Cliquez sur <b>Fusionner</b> et enregistrez le PDF combiné.'] },
        { h: 'Rectos et versos scannés en deux piles ?' },
        'Utilisez la <a href="{t:alternate-merge-pdf}">Fusion alternée</a> : choisissez le fichier des rectos puis celui des versos, et LunaVerta les assemble page par page, même quand les versos sont à l\'envers.',
        { h: 'Faites le ménage' },
        { ul: ['Les scans recto verso sont pleins de versos vides. <a href="{t:remove-blank-pages}">Supprimer les pages blanches</a> les retire.', 'Rendez le texte consultable et copiable avec l\'<a href="{t:ocr}">OCR</a>.', 'Trop lourd pour l\'envoyer ? Utilisez <a href="{compress}">Compresser PDF</a>.'] },
        { h: 'Seulement du papier ?' },
        'Prenez des photos avec votre téléphone dans <a href="{t:scan-to-pdf}">Scanner en PDF</a>. Les pages sont redressées et deviennent un PDF aussitôt.'
      ]
    }
  }
];
