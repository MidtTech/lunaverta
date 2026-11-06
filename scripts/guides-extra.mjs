// The guides in Swedish, Norwegian, German, Spanish and French, adapted to each country (personnummer, fødselsnummer, Steuer-ID, DNI, sécurité sociale).
// Same structure as guides.mjs; merged into GUIDES by build-pages.mjs and make-share-images.mjs.
export const GUIDE_INDEX_EXTRA = {
  sv: { slug: 'guider', title: 'Guider: vardagens PDF-uppgifter, helt privat · LunaVerta', desc: 'Korta guider för vanliga uppgifter: ta bort personnummer, skicka en lönespecifikation säkert, signera ett hyresavtal utan att skriva ut, samla kvitton i en PDF med mera.', h1: 'Guider', lead: 'Korta, praktiska guider för de uppgifter man oftast behöver göra med sina dokument. Allt sker på din egen enhet.', read: 'Läs guiden', open: 'Öppna verktyget', all: 'Alla guider', guides: 'Guider' },
  no: { slug: 'veiledninger', title: 'Veiledninger: hverdagens PDF-oppgaver, helt privat · LunaVerta', desc: 'Korte veiledninger for vanlige oppgaver: fjern fødselsnummer, send en lønnsslipp trygt, signer en husleiekontrakt uten å skrive ut, samle kvitteringer i én PDF og mer.', h1: 'Veiledninger', lead: 'Korte, praktiske veiledninger for oppgavene folk oftest må gjøre med dokumentene sine. Alt skjer på din egen enhet.', read: 'Les veiledningen', open: 'Åpne verktøyet', all: 'Alle veiledninger', guides: 'Veiledninger' },
  de: { slug: 'anleitungen', title: 'Anleitungen: alltägliche PDF-Aufgaben, ganz privat · LunaVerta', desc: 'Kurze Anleitungen für häufige Aufgaben: Steuer-ID entfernen, Gehaltsabrechnung sicher teilen, Mietvertrag ohne Drucker unterschreiben, Belege in einem PDF sammeln und mehr.', h1: 'Anleitungen', lead: 'Kurze, praktische Anleitungen für die Aufgaben, die man am häufigsten mit seinen Dokumenten erledigen muss. Alles passiert auf deinem eigenen Gerät.', read: 'Anleitung lesen', open: 'Werkzeug öffnen', all: 'Alle Anleitungen', guides: 'Anleitungen' }
};

export const GUIDE_TEXT = {
  // ---------------------------------------------------------------- Swedish
  sv: {
    cpr: {
      slug: 'ta-bort-personnummer-fran-pdf', title: 'Ta bort personnummer från en PDF – gratis och utan uppladdning · LunaVerta',
      desc: 'Så tar du bort ditt personnummer från en PDF för gott, så att det inte kan kopieras eller hittas. Gratis, och filen lämnar aldrig din enhet.',
      h1: 'Ta bort ett personnummer från en PDF', lead: 'Ett personnummer på ett dokument du delar kan missbrukas. Så tar du bort det ordentligt, så att det verkligen försvinner ur filen och inte bara döljs.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Maskera PDF</a> och välj din PDF.', 'LunaVerta går igenom varje sida och markerar personnummer med gult, tillsammans med annat man brukar ta bort, till exempel kontonummer, e-postadresser och telefonnummer.', 'Vill du bara ta bort personnumret stänger du av de andra kategorierna. Tryck på en markering för att behålla just den texten.', 'Klicka på <b>Ta bort … och spara ny version</b>. Den markerade texten raderas ur filen och en kopia sparas på din enhet. Originalet ändras inte.'] },
        { h: 'Varför en svart ruta i Word eller en PDF-läsare inte räcker' },
        'Om du ritar en svart rektangel över ett nummer täcker den oftast bara över det. Texten ligger kvar under, och vem som helst kan kopiera ut den eller hitta den med en sökning. LunaVerta raderar själva tecknen, så det finns inget kvar att kopiera.',
        { h: 'Kontrollera resultatet' },
        'Öppna den sparade PDF:en, tryck Ctrl+F (eller Cmd+F på en Mac) och sök på de första siffrorna i numret. Inget ska hittas.',
        { h: 'Skannade dokument' },
        'Är PDF:en en skanning (en bild av papper) finns det ingen text att söka i. Använd <b>Svärta</b> i samma fönster och dra själv en ruta över numret; den bränns in i bilden när du sparar.'
      ]
    },
    payslip: {
      slug: 'skicka-lonespecifikation-sakert', title: 'Skicka en lönespecifikation säkert, utan personnummer och kontonummer · LunaVerta',
      desc: 'Ber en hyresvärd, bank eller ny arbetsgivare om din lönespecifikation? Ta först bort personnummer, kontonummer och andra uppgifter. Gratis och privat.',
      h1: 'Skicka en lönespecifikation säkert', lead: 'Hyresvärdar, banker och nya arbetsgivare vill ofta se en lönespecifikation. De behöver din inkomst, inte ditt personnummer eller bankkonto. Så skickar du bara det de behöver.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Maskera PDF</a> och välj lönespecifikationen.', 'Ditt personnummer, kontonummer, e-post och telefonnummer hittas och markeras med gult.', 'Behåll det mottagaren behöver se. Är lönebeloppen markerade stänger du av kategorin Priser, så att de står kvar.', 'Klicka på <b>Ta bort … och spara ny version</b> och skicka den sparade kopian.'] },
        { h: 'Vad som ska bort och vad som ska stå kvar' },
        { ul: ['Ta bort: personnummer, clearing- och kontonummer, skatteuppgifter du inte har blivit ombedd att visa och din adress om mottagaren redan har den.', 'Behåll: ditt namn, arbetsgivaren, perioden och lönebeloppen. Det är oftast det mottagaren behöver kontrollera.'] },
        { h: 'Flera månader?' },
        'Blir du ombedd att visa tre månader maskerar du varje lönespecifikation och slår sedan ihop dem med <a href="{merge}">Slå ihop PDF</a>, så att du bara skickar en fil.'
      ]
    },
    lease: {
      slug: 'signera-hyresavtal-utan-att-skriva-ut', title: 'Signera ett hyresavtal utan att skriva ut · LunaVerta',
      desc: 'Signera ett hyresavtal eller annat avtal som PDF: rita din namnteckning, placera den, lägg till datum och skicka tillbaka. Ingen skrivare, ingen skanner, ingen uppladdning.',
      h1: 'Signera ett hyresavtal utan att skriva ut', lead: 'Du har fått ett hyresavtal som PDF och ska skriva under. Du behöver ingen skrivare eller skanner: du kan signera på datorn eller telefonen på en minut.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Signera PDF</a> och välj avtalet.', 'Rita din namnteckning med musen eller fingret. Kryssa i <b>Lägg till dagens datum under namnteckningen</b> om datumet ska stå där.', 'Klicka på <b>Placera på sidan</b> och klicka sedan där namnteckningen ska stå. Gå till andra sidor och klicka igen om de också ska signeras eller ha initialer.', 'Klicka på <b>Spara PDF</b> och skicka tillbaka den signerade kopian.'] },
        { h: 'Gäller en ritad namnteckning?' },
        'En ritad namnteckning på en PDF är en enkel elektronisk underskrift. Många hyresvärdar och företag godtar den för hyresavtal och vardagliga avtal, men vissa dokument kräver en starkare underskrift, till exempel med BankID. Är du osäker kan du fråga den som skickade avtalet om de godtar den. Detta är inte juridisk rådgivning.',
        { h: 'Signerar du ofta?' },
        'Kryssa i <b>Kom ihåg på den här enheten</b>, så sparas namnteckningen på din egen enhet och är redo nästa gång. Den skickas aldrig någonstans.'
      ]
    },
    receipts: {
      slug: 'samla-kvitton-i-en-pdf', title: 'Samla kvitton i en PDF – för försäkring, utlägg eller deklarationen · LunaVerta',
      desc: 'Fotografera dina kvitton och gör dem till en snygg, sökbar PDF för ett försäkringsärende, en utläggsredovisning eller deklarationen. Gratis och privat.',
      h1: 'Samla kvitton i en PDF', lead: 'Försäkringsärenden, utlägg och avdrag kräver ofta kvittona som en enda fil. Så går du från en hög papper till en snygg PDF med bara telefonen.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Skanna till PDF</a> på telefonen och fotografera det första kvittot.', 'Kanterna hittas och kvittot rätas upp, precis som en riktig skanning. Klicka på <b>Lägg till en sida</b> och fotografera nästa. Upprepa för alla.', 'Kryssa i <b>Gör texten sökbar (OCR)</b>, så att du kan söka efter beloppen senare.', 'Klicka på <b>Skapa PDF</b> och sedan på <b>Spara</b>. Nu är alla kvitton en fil.'] },
        { h: 'Är några kvitton redan PDF:er?' },
        'Spara din skanning och slå sedan ihop den med de andra PDF:erna i <a href="{merge}">Slå ihop PDF</a>.',
        { h: 'För stor för att skicka med e-post?' },
        'Många e-posttjänster stoppar vid 20–25 MB. <a href="{compress}">Komprimera PDF</a> gör filen mindre utan att kvittona blir svåra att läsa.'
      ]
    },
    heic: {
      slug: 'iphone-bilder-heic-till-jpg', title: 'iPhone-bilder (HEIC) till JPG – gratis och utan uppladdning · LunaVerta',
      desc: 'Är dina iPhone-bilder .HEIC-filer som Windows och många webbplatser inte kan öppna? Gör om dem till vanliga JPG-bilder på några sekunder, på din egen enhet.',
      h1: 'Gör om iPhone-bilder (HEIC) till JPG', lead: 'iPhone sparar bilder som HEIC för att spara plats. Det fungerar fint i telefonen, men många Windows-datorer, webbplatser och formulär tar inte emot dem. Så gör du om dem till vanliga JPG-bilder.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">HEIC till JPG</a>.', 'Välj dina HEIC-bilder eller släpp dem på sidan. Du kan ta många på en gång.', 'De görs om till JPG direkt, på din enhet.', 'Klicka på <b>Spara</b> vid varje bild, eller spara alla på en gång som .zip.'] },
        { h: 'Blir kvaliteten densamma?' },
        'Bilden ser likadan ut. JPG-filer är lite större än HEIC, och det är priset för att de kan läsas överallt. Behöver de vara mindre, till exempel för ett formulär med storleksgräns, använder du <a href="{t:compress-image}">Komprimera bild</a> efteråt.',
        { h: 'Plats och andra dolda uppgifter' },
        'Bilder från en telefon sparar oftast var de togs. Delar du dem med främlingar kör du dem också genom <a href="{t:remove-photo-location}">Ta bort platsinformation från foton</a>.',
        { h: 'Få iPhone att sluta göra HEIC' },
        'Gå på iPhone till Inställningar › Kamera › Format och välj <b>Mest kompatibelt</b>. Nya bilder sparas då som JPG. Bilder du redan har tagit förblir HEIC.'
      ]
    },
    email: {
      slug: 'gor-pdf-liten-nog-for-e-post', title: 'Gör en PDF liten nog att skicka med e-post · LunaVerta',
      desc: 'Är PDF:en för stor att bifoga? De flesta e-posttjänster stoppar vid 20–25 MB. Så gör du den mindre, gratis och utan att ladda upp den någonstans.',
      h1: 'Gör en PDF liten nog för e-post', lead: 'Din PDF är för stor att bifoga. De flesta e-posttjänster stoppar vid 20 till 25 MB, och vissa företag har en ännu lägre gräns. Så gör du den liten nog.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Komprimera PDF</a> och välj PDF:en.', 'Varje sida ritas om mer kompakt. Texten går fortfarande att söka i och kopiera.', 'Du ser hur mycket mindre den blev. Klicka på <b>Spara</b>.', 'Kunde den inte bli mindre får du tillbaka originalet oförändrat.'] },
        { h: 'Vad som gör PDF:er stora' },
        'Nästan alltid bilder: skanningar, foton och mobilbilder av papper. En skanning på 30 sidor kan lätt vara 40 MB; efter komprimering är den ofta nere på några få MB. PDF:er med mest skriven text är oftast små redan, och komprimering gör inte mycket.',
        { h: 'Fortfarande för stor?' },
        { ul: ['Dela upp den: <a href="{t:split-pdf}">Dela PDF</a> gör en fil per sida, och <a href="{t:extract-pages}">Extrahera PDF-sidor</a> låter dig skicka bara de sidor som spelar roll.', 'Skicka den i delar, en bilaga per e-post.'] },
        { h: 'När du inte ska komprimera' },
        'Komprimering gör om sidorna till bilder med texten kvar ovanpå, så länkar och ifyllbara formulärfält försvinner. Ska mottagaren fylla i eller signera formuläret skickar du originalet.'
      ]
    },
    gps: {
      slug: 'ta-bort-plats-innan-du-delar-bilder', title: 'Ta bort platsen från bilder innan du delar eller säljer · LunaVerta',
      desc: 'Mobilbilder avslöjar ofta var de togs, även ditt hem. Ta bort GPS-platsen och andra dolda uppgifter innan du delar eller säljer på nätet. Gratis och privat.',
      h1: 'Ta bort platsen från bilder innan du delar dem', lead: 'De flesta mobilbilder sparar i tysthet var de togs. En bild på soffan du säljer kan berätta för en främling var du bor. Så tar du bort det innan du delar.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">Ta bort platsinformation från foton</a>.', 'Välj dina bilder eller släpp dem på sidan.', 'Plats, kamerauppgifter, datum och andra dolda uppgifter tas bort. Själva bilden rörs inte, så kvaliteten är densamma.', 'Spara de rensade bilderna och dela dem i stället för originalen.'] },
        { h: 'Tar inte webbplatsen bort det ändå?' },
        'Vissa stora webbplatser tar bort platsen när du laddar upp, men det syns inte alltid, och bilder som skickas med e-post, som filer i en chatt eller på ett USB-minne behåller den oftast. Rensar du dem först behöver du inte lita på någon annan.',
        { h: 'Stäng av det för framtida bilder' },
        { ul: ['iPhone: Inställningar › Integritet och säkerhet › Platstjänster › Kamera › Aldrig.', 'Android: öppna Kamera-appen, gå till dess inställningar och stäng av platstaggar (namnet varierar mellan telefoner).'] }
      ]
    },
    word: {
      slug: 'pdf-till-word-behall-layouten', title: 'PDF till Word som behåller layouten – gratis och privat · LunaVerta',
      desc: 'Gör om en PDF till ett redigerbart Word-dokument som behåller typsnitt, fet text, justering och bilder. Gratis, inget konto, och PDF:en lämnar aldrig din enhet.',
      h1: 'Gör om en PDF till Word och behåll layouten', lead: 'Du behöver ändra ett dokument som du bara har som PDF. Så gör du om det till en Word-fil som du kan redigera, med typsnitt, fet text, justering och bilder kvar.',
      body: [
        { h: 'Steg för steg' },
        { ol: ['Öppna <a href="{tool}">PDF till Word</a> och välj PDF:en.', 'Texten på varje sida läses och byggs till en .docx-fil med stycken, typsnitt, storlekar, fetstil och kursiv, justering och bilder.', 'Klicka på <b>Spara</b>.', 'Öppna den i Word, Pages, LibreOffice eller Google Dokument och redigera.'] },
        { h: 'Behöver du bara rätta några ord?' },
        'Då behöver du kanske inte Word alls. Med <a href="{t:edit-pdf}">Redigera PDF</a> rättar du texten direkt i PDF:en, i dess eget typsnitt, och resten av sidan blir precis som den var.',
        { h: 'Skannade PDF:er' },
        'En skanning är en bild av papper, så det finns ingen text att läsa. Kör den först genom <a href="{t:ocr}">OCR: gör en PDF sökbar</a> och gör sedan om resultatet till Word.',
        { h: 'Det som inte följer med' },
        'Komplicerade layouter, till exempel text i många spalter, tabeller ritade med linjer eller text ovanpå bilder, kan behöva lite städning i Word efteråt.'
      ]
    }
  },

  // ---------------------------------------------------------------- Norwegian
  no: {
    cpr: {
      slug: 'fjern-fodselsnummer-fra-pdf', title: 'Fjern fødselsnummer fra en PDF – gratis og uten opplasting · LunaVerta',
      desc: 'Slik fjerner du fødselsnummeret ditt fra en PDF for godt, så det ikke kan kopieres eller finnes. Gratis, og filen forlater aldri enheten din.',
      h1: 'Fjern et fødselsnummer fra en PDF', lead: 'Et fødselsnummer på et dokument du deler, kan misbrukes. Slik fjerner du det ordentlig, så det faktisk er borte fra filen og ikke bare skjult.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Sladd PDF</a>, og velg PDF-en.', 'LunaVerta går gjennom alle sidene og markerer fødselsnumre med gult, sammen med annet man vanligvis fjerner, for eksempel kontonumre, e-postadresser og telefonnumre.', 'Vil du bare fjerne fødselsnummeret, slår du av de andre kategoriene. Trykk på en markering for å beholde akkurat den teksten.', 'Klikk på <b>Fjern … og lagre ny versjon</b>. Den markerte teksten slettes fra filen, og en kopi lagres på enheten din. Originalen endres ikke.'] },
        { h: 'Hvorfor en svart boks i Word eller en PDF-leser ikke er nok' },
        'Tegner du et svart felt over et nummer, dekker det som regel bare over. Teksten ligger fortsatt under, og hvem som helst kan kopiere den ut eller finne den med et søk. LunaVerta sletter selve tegnene, så det er ingenting igjen å kopiere.',
        { h: 'Sjekk resultatet' },
        'Åpne den lagrede PDF-en, trykk Ctrl+F (eller Cmd+F på en Mac), og søk etter de første sifrene i nummeret. Ingenting skal bli funnet.',
        { h: 'Skannede dokumenter' },
        'Er PDF-en en skanning (et bilde av papir), finnes det ingen tekst å søke i. Bruk <b>Sladd</b> i samme vindu, og dra selv et felt over nummeret; det brennes inn i bildet når du lagrer.'
      ]
    },
    payslip: {
      slug: 'send-lonnsslipp-trygt', title: 'Send en lønnsslipp trygt – uten fødselsnummer og kontonummer · LunaVerta',
      desc: 'Ber utleier, bank eller ny arbeidsgiver om lønnsslippen din? Fjern først fødselsnummer, kontonummer og andre opplysninger. Gratis og privat.',
      h1: 'Send en lønnsslipp trygt', lead: 'Utleiere, banker og nye arbeidsgivere ber ofte om å se en lønnsslipp. De trenger inntekten din, ikke fødselsnummeret eller bankkontoen din. Slik sender du bare det de trenger.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Sladd PDF</a>, og velg lønnsslippen.', 'Fødselsnummer, kontonumre, e-post og telefonnummer blir funnet og markert med gult.', 'Behold det mottakeren skal se. Er lønnsbeløpene markert, slår du av kategorien Priser, så de blir stående.', 'Klikk på <b>Fjern … og lagre ny versjon</b>, og send den lagrede kopien.'] },
        { h: 'Hva som skal bort, og hva som skal bli' },
        { ul: ['Fjern: fødselsnummer, kontonummer, skatteopplysninger du ikke er bedt om, og adressen din hvis mottakeren allerede har den.', 'Behold: navnet ditt, arbeidsgiveren, perioden og lønnsbeløpene. Det er som regel det mottakeren skal sjekke.'] },
        { h: 'Flere måneder?' },
        'Blir du bedt om tre måneder, sladder du hver lønnsslipp og slår dem sammen etterpå med <a href="{merge}">Slå sammen PDF</a>, så du bare sender én fil.'
      ]
    },
    lease: {
      slug: 'signer-husleiekontrakt-uten-a-skrive-ut', title: 'Signer en husleiekontrakt uten å skrive ut · LunaVerta',
      desc: 'Signer en husleiekontrakt eller annen avtale som PDF: tegn signaturen, plasser den, legg til dato og send den tilbake. Ingen skriver, ingen skanner, ingen opplasting.',
      h1: 'Signer en husleiekontrakt uten å skrive ut', lead: 'Du har fått en husleiekontrakt som PDF og skal signere. Du trenger ikke skriver og skanner: du kan signere på datamaskinen eller telefonen på et minutt.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Signer PDF</a>, og velg kontrakten.', 'Tegn signaturen din med musen eller fingeren. Kryss av for <b>Legg til dagens dato under signaturen</b> hvis datoen skal stå der.', 'Klikk på <b>Plasser på siden</b>, og klikk deretter der signaturen skal stå. Gå til andre sider og klikk igjen hvis de også skal signeres eller ha initialer.', 'Klikk på <b>Lagre PDF</b>, og send den signerte kopien tilbake.'] },
        { h: 'Er en tegnet signatur gyldig?' },
        'En tegnet signatur på en PDF er en enkel elektronisk signatur. Mange utleiere og bedrifter godtar den for husleiekontrakter og vanlige avtaler, men noen dokumenter krever en sterkere signatur, for eksempel med BankID. Er du i tvil, kan du spørre den som sendte kontrakten, om de godtar den. Dette er ikke juridisk rådgivning.',
        { h: 'Signerer du ofte?' },
        'Kryss av for <b>Husk på denne enheten</b>, så lagres signaturen på din egen enhet og er klar neste gang. Den sendes aldri noe sted.'
      ]
    },
    receipts: {
      slug: 'samle-kvitteringer-i-en-pdf', title: 'Samle kvitteringer i én PDF – til forsikring, utlegg eller skattemeldingen · LunaVerta',
      desc: 'Ta bilder av kvitteringene dine, og gjør dem om til én pen, søkbar PDF til en forsikringssak, en utleggsrapport eller skattemeldingen. Gratis og privat.',
      h1: 'Samle kvitteringer i én PDF', lead: 'Forsikringssaker, utlegg og fradrag krever ofte kvitteringene som én fil. Slik går du fra en bunke papir til én pen PDF med bare telefonen.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Skann til PDF</a> på telefonen, og ta bilde av den første kvitteringen.', 'Kantene blir funnet, og kvitteringen rettes opp som en ekte skanning. Klikk på <b>Legg til en side</b>, og fotografer den neste. Gjenta for alle.', 'Kryss av for <b>Gjør teksten søkbar (OCR)</b>, så du kan søke etter beløpene senere.', 'Klikk på <b>Lag PDF</b> og deretter <b>Lagre</b>. Nå er alle kvitteringene én fil.'] },
        { h: 'Er noen kvitteringer allerede PDF-er?' },
        'Lagre skanningen, og slå den deretter sammen med de andre PDF-ene i <a href="{merge}">Slå sammen PDF</a>.',
        { h: 'For stor til å sende på e-post?' },
        'Mange e-posttjenester stopper ved 20–25 MB. <a href="{compress}">Komprimer PDF</a> gjør filen mindre uten at kvitteringene blir vanskelige å lese.'
      ]
    },
    heic: {
      slug: 'iphone-bilder-heic-til-jpg', title: 'iPhone-bilder (HEIC) til JPG – gratis og uten opplasting · LunaVerta',
      desc: 'Er iPhone-bildene dine .HEIC-filer som Windows og mange nettsteder ikke kan åpne? Gjør dem om til vanlige JPG-bilder på sekunder, på din egen enhet.',
      h1: 'Gjør iPhone-bilder (HEIC) om til JPG', lead: 'iPhone lagrer bilder som HEIC for å spare plass. Det går fint på telefonen, men mange Windows-maskiner, nettsteder og skjemaer tar ikke imot dem. Slik gjør du dem om til vanlige JPG-bilder.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">HEIC til JPG</a>.', 'Velg HEIC-bildene dine, eller slipp dem på siden. Du kan ta mange samtidig.', 'De gjøres om til JPG med en gang, på enheten din.', 'Klikk på <b>Lagre</b> ved hvert bilde, eller lagre alle samtidig som .zip.'] },
        { h: 'Blir kvaliteten den samme?' },
        'Bildet ser likt ut. JPG-filer er litt større enn HEIC, og det er prisen for at de kan leses overalt. Må de være mindre, for eksempel til et skjema med størrelsesgrense, bruker du <a href="{t:compress-image}">Komprimer bilde</a> etterpå.',
        { h: 'Posisjon og andre skjulte data' },
        'Bilder fra en telefon lagrer som regel hvor de er tatt. Deler du dem med fremmede, kjører du dem også gjennom <a href="{t:remove-photo-location}">Fjern posisjon fra bilder</a>.',
        { h: 'Få iPhone til å slutte å lage HEIC' },
        'Gå på iPhone til Innstillinger › Kamera › Formater, og velg <b>Mest kompatibel</b>. Nye bilder lagres da som JPG. Bilder du allerede har tatt, forblir HEIC.'
      ]
    },
    email: {
      slug: 'gjor-pdf-liten-nok-for-e-post', title: 'Gjør en PDF liten nok til å sende på e-post · LunaVerta',
      desc: 'Er PDF-en for stor til å legge ved? De fleste e-posttjenester stopper ved 20–25 MB. Slik gjør du den mindre, gratis og uten å laste den opp noe sted.',
      h1: 'Gjør en PDF liten nok for e-post', lead: 'PDF-en din er for stor til å legge ved. De fleste e-posttjenester stopper ved 20 til 25 MB, og noen bedrifter har en enda lavere grense. Slik gjør du den liten nok.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Komprimer PDF</a>, og velg PDF-en.', 'Hver side tegnes mer kompakt. Teksten kan fortsatt søkes i og kopieres.', 'Du ser hvor mye mindre den ble. Klikk på <b>Lagre</b>.', 'Kunne den ikke bli mindre, får du originalen tilbake uendret.'] },
        { h: 'Hva som gjør PDF-er store' },
        'Nesten alltid bilder: skanninger, fotografier og mobilbilder av papir. En skanning på 30 sider kan fort være 40 MB; etter komprimering er den ofte nede i noen få MB. PDF-er med mest skrevet tekst er som regel små fra før, og komprimering gjør lite.',
        { h: 'Fortsatt for stor?' },
        { ul: ['Del den opp: <a href="{t:split-pdf}">Del opp PDF</a> lager én fil per side, og <a href="{t:extract-pages}">Hent ut PDF-sider</a> lar deg sende bare sidene som betyr noe.', 'Send den i deler, ett vedlegg per e-post.'] },
        { h: 'Når du ikke skal komprimere' },
        'Komprimering gjør sidene om til bilder med teksten bevart over, så lenker og utfyllbare skjemafelt forsvinner. Skal mottakeren fylle ut eller signere skjemaet, sender du originalen.'
      ]
    },
    gps: {
      slug: 'fjern-posisjon-for-du-deler-bilder', title: 'Fjern posisjonen fra bilder før du deler eller selger · LunaVerta',
      desc: 'Mobilbilder avslører ofte hvor de er tatt, også hjemmet ditt. Fjern GPS-posisjonen og andre skjulte data før du deler eller selger på nett. Gratis og privat.',
      h1: 'Fjern posisjonen fra bilder før du deler dem', lead: 'De fleste mobilbilder lagrer i det stille hvor de er tatt. Et bilde av sofaen du selger, kan fortelle en fremmed hvor du bor. Slik fjerner du det før du deler.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">Fjern posisjon fra bilder</a>.', 'Velg bildene dine, eller slipp dem på siden.', 'Posisjon, kameraopplysninger, datoer og andre skjulte data fjernes. Selve bildet røres ikke, så kvaliteten er den samme.', 'Lagre de rensede bildene, og del dem i stedet for originalene.'] },
        { h: 'Fjerner ikke nettstedet det uansett?' },
        'Noen store nettsteder fjerner posisjonen når du laster opp, men det er ikke alltid lett å se, og bilder som sendes på e-post, som filer i en chat eller på en minnepinne, beholder den som regel. Renser du dem først, trenger du ikke stole på andre.',
        { h: 'Slå det av for fremtidige bilder' },
        { ul: ['iPhone: Innstillinger › Personvern og sikkerhet › Stedstjenester › Kamera › Aldri.', 'Android: åpne Kamera-appen, gå til innstillingene, og slå av stedsmerking (navnet varierer fra telefon til telefon).'] }
      ]
    },
    word: {
      slug: 'pdf-til-word-behold-oppsettet', title: 'PDF til Word som beholder oppsettet – gratis og privat · LunaVerta',
      desc: 'Gjør en PDF om til et redigerbart Word-dokument som beholder skrifttyper, fet tekst, justering og bilder. Gratis, ingen konto, og PDF-en forlater aldri enheten din.',
      h1: 'Gjør en PDF om til Word og behold oppsettet', lead: 'Du må endre et dokument du bare har som PDF. Slik gjør du det om til en Word-fil du kan redigere, med skrifttyper, fet tekst, justering og bilder bevart.',
      body: [
        { h: 'Steg for steg' },
        { ol: ['Åpne <a href="{tool}">PDF til Word</a>, og velg PDF-en.', 'Teksten på hver side leses og bygges til en .docx-fil med avsnitt, skrifttyper, størrelser, fet og kursiv, justering og bilder.', 'Klikk på <b>Lagre</b>.', 'Åpne den i Word, Pages, LibreOffice eller Google Dokumenter, og rediger.'] },
        { h: 'Skal du bare rette noen få ord?' },
        'Da trenger du kanskje ikke Word i det hele tatt. Med <a href="{t:edit-pdf}">Rediger PDF</a> retter du teksten direkte i PDF-en, i dens egen skrift, og resten av siden blir akkurat som før.',
        { h: 'Skannede PDF-er' },
        'En skanning er et bilde av papir, så det finnes ingen tekst å lese. Kjør den først gjennom <a href="{t:ocr}">OCR: gjør en PDF søkbar</a>, og gjør deretter resultatet om til Word.',
        { h: 'Det som ikke blir med' },
        'Kompliserte oppsett, for eksempel tekst i mange spalter, tabeller tegnet med streker eller tekst oppå bilder, kan trenge litt opprydding i Word etterpå.'
      ]
    }
  },

  // ---------------------------------------------------------------- German
  de: {
    cpr: {
      slug: 'steuer-id-aus-pdf-entfernen', title: 'Steuer-ID und Sozialversicherungsnummer aus einem PDF entfernen · LunaVerta',
      desc: 'So entfernst du Steuer-ID, Sozialversicherungsnummer und andere Kennnummern dauerhaft aus einem PDF, sodass sie nicht kopiert oder gefunden werden können. Kostenlos, und die Datei verlässt nie dein Gerät.',
      h1: 'Steuer-ID und Sozialversicherungsnummer aus einem PDF entfernen', lead: 'Kennnummern wie die Steuer-ID oder die Sozialversicherungsnummer auf einem Dokument, das du weitergibst, können missbraucht werden. So entfernst du sie richtig, sodass sie wirklich aus der Datei verschwinden und nicht nur verdeckt sind.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF schwärzen</a> und wähle dein PDF.', 'LunaVerta geht jede Seite durch und markiert Kennnummern gelb, dazu weitere Angaben, die man meist entfernt, zum Beispiel IBANs, E-Mail-Adressen und Telefonnummern.', 'Willst du nur die Kennnummer entfernen, schalte die anderen Kategorien aus. Tippe auf eine Markierung, um genau diesen Text zu behalten.', 'Klicke auf <b>… entfernen und neue Version speichern</b>. Der markierte Text wird aus der Datei gelöscht, und eine Kopie wird auf deinem Gerät gespeichert. Das Original bleibt unverändert.'] },
        { h: 'Warum ein schwarzer Kasten in Word oder im PDF-Reader nicht reicht' },
        'Ein schwarzes Rechteck über einer Nummer verdeckt sie meist nur. Der Text liegt weiter darunter, und jeder kann ihn herauskopieren oder mit einer Suche finden. LunaVerta löscht die Zeichen selbst, sodass nichts zum Kopieren übrig bleibt.',
        { h: 'Das Ergebnis prüfen' },
        'Öffne das gespeicherte PDF, drücke Strg+F (oder Cmd+F auf dem Mac) und suche nach den ersten Ziffern der Nummer. Es darf nichts gefunden werden.',
        { h: 'Gescannte Dokumente' },
        'Ist das PDF ein Scan (ein Bild von Papier), gibt es keinen Text zum Durchsuchen. Nutze <b>Schwärzen</b> im selben Fenster und zieh selbst einen Kasten über die Nummer; er wird beim Speichern fest ins Bild eingebrannt.'
      ]
    },
    payslip: {
      slug: 'gehaltsabrechnung-sicher-teilen', title: 'Gehaltsabrechnung sicher teilen, ohne Steuer-ID und IBAN · LunaVerta',
      desc: 'Vermieter, Bank oder neuer Arbeitgeber wollen deine Gehaltsabrechnung sehen? Entferne vorher Steuer-ID, Sozialversicherungsnummer, IBAN und andere Angaben. Kostenlos und privat.',
      h1: 'Gehaltsabrechnung sicher teilen', lead: 'Vermieter, Banken und neue Arbeitgeber möchten oft eine Gehaltsabrechnung sehen. Sie brauchen dein Einkommen, nicht deine Steuer-ID oder dein Bankkonto. So schickst du nur das, was sie brauchen.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF schwärzen</a> und wähle die Gehaltsabrechnung.', 'Steuer-ID, Sozialversicherungsnummer, IBAN, E-Mail und Telefonnummer werden gefunden und gelb markiert.', 'Behalte, was der Empfänger sehen muss. Sind die Gehaltsbeträge markiert, schalte die Kategorie Preise aus, damit sie stehen bleiben.', 'Klicke auf <b>… entfernen und neue Version speichern</b> und schick die gespeicherte Kopie.'] },
        { h: 'Was weg soll und was bleiben soll' },
        { ul: ['Entfernen: Steuer-ID, Sozialversicherungsnummer, IBAN, Angaben zu Steuerklasse oder Religion, nach denen niemand gefragt hat, und deine Adresse, wenn der Empfänger sie schon hat.', 'Behalten: deinen Namen, den Arbeitgeber, den Zeitraum und die Beträge. Das ist meist das, was der Empfänger prüfen muss.'] },
        { h: 'Mehrere Monate?' },
        'Werden drei Monate verlangt, schwärze jede Abrechnung und füge sie danach mit <a href="{merge}">PDF zusammenfügen</a> zusammen, damit du nur eine Datei schickst.'
      ]
    },
    lease: {
      slug: 'mietvertrag-ohne-drucker-unterschreiben', title: 'Mietvertrag ohne Drucker unterschreiben · LunaVerta',
      desc: 'Unterschreibe einen Mietvertrag oder einen anderen Vertrag als PDF: Unterschrift zeichnen, platzieren, Datum hinzufügen und zurückschicken. Kein Drucker, kein Scanner, kein Upload.',
      h1: 'Mietvertrag ohne Drucker unterschreiben', lead: 'Du hast einen Mietvertrag als PDF bekommen und sollst unterschreiben. Drucker und Scanner brauchst du nicht: Du kannst ihn in einer Minute am Computer oder Handy unterschreiben.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF unterschreiben</a> und wähle den Vertrag.', 'Zeichne deine Unterschrift mit der Maus oder dem Finger. Hake <b>Heutiges Datum unter die Unterschrift setzen</b> an, wenn das Datum dabei stehen soll.', 'Klicke auf <b>Auf der Seite platzieren</b> und dann dorthin, wo die Unterschrift stehen soll. Geh zu weiteren Seiten und klicke erneut, wenn sie auch unterschrieben oder paraphiert werden müssen.', 'Klicke auf <b>PDF speichern</b> und schick die unterschriebene Kopie zurück.'] },
        { h: 'Ist eine gezeichnete Unterschrift gültig?' },
        'Eine gezeichnete Unterschrift auf einem PDF ist eine einfache elektronische Signatur. Viele Vermieter und Firmen akzeptieren sie, aber manche Verträge verlangen gesetzlich die Schriftform, also eine handschriftliche oder eine qualifizierte elektronische Signatur. Frag im Zweifel bei dem nach, der dir den Vertrag geschickt hat. Dies ist keine Rechtsberatung.',
        { h: 'Unterschreibst du oft?' },
        'Hake <b>Auf diesem Gerät merken</b> an, dann wird die Unterschrift auf deinem eigenen Gerät gespeichert und ist beim nächsten Mal bereit. Sie wird nie irgendwohin geschickt.'
      ]
    },
    receipts: {
      slug: 'belege-in-einem-pdf-sammeln', title: 'Belege in einem PDF sammeln – für Versicherung, Spesen oder Steuererklärung · LunaVerta',
      desc: 'Fotografiere deine Belege und mach daraus ein ordentliches, durchsuchbares PDF für die Versicherung, die Spesenabrechnung oder die Steuererklärung. Kostenlos und privat.',
      h1: 'Belege in einem PDF sammeln', lead: 'Versicherungsfälle, Spesen und die Steuererklärung verlangen die Belege oft als eine einzige Datei. So kommst du nur mit dem Handy von einem Stapel Papier zu einem ordentlichen PDF.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">Dokument scannen</a> auf dem Handy und fotografiere den ersten Beleg.', 'Die Ränder werden gefunden und der Beleg wird begradigt wie bei einem echten Scan. Klicke auf <b>Seite hinzufügen</b> und fotografiere den nächsten. Wiederhole das für alle.', 'Hake <b>Text durchsuchbar machen (OCR)</b> an, damit du später nach Beträgen suchen kannst.', 'Klicke auf <b>PDF erstellen</b> und dann auf <b>Speichern</b>. Jetzt sind alle Belege eine Datei.'] },
        { h: 'Sind manche Belege schon PDFs?' },
        'Speichere deinen Scan und füge ihn dann mit den anderen PDFs in <a href="{merge}">PDF zusammenfügen</a> zusammen.',
        { h: 'Zu groß für eine E-Mail?' },
        'Viele E-Mail-Dienste stoppen bei 20–25 MB. <a href="{compress}">PDF komprimieren</a> macht die Datei kleiner, ohne dass die Belege schwer lesbar werden.'
      ]
    },
    heic: {
      slug: 'iphone-fotos-heic-in-jpg', title: 'iPhone-Fotos (HEIC) in JPG umwandeln – kostenlos und ohne Upload · LunaVerta',
      desc: 'Deine iPhone-Fotos sind .HEIC-Dateien, die Windows und viele Websites nicht öffnen? Wandle sie in Sekunden in normale JPG-Fotos um, auf deinem eigenen Gerät.',
      h1: 'iPhone-Fotos (HEIC) in JPG umwandeln', lead: 'iPhones speichern Fotos als HEIC, um Platz zu sparen. Auf dem Handy ist das kein Problem, aber viele Windows-PCs, Websites und Formulare nehmen sie nicht an. So machst du daraus normale JPG-Fotos.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">HEIC in JPG</a>.', 'Wähle deine HEIC-Fotos oder zieh sie auf die Seite. Du kannst viele auf einmal nehmen.', 'Sie werden sofort in JPG umgewandelt, auf deinem Gerät.', 'Klicke bei jedem Foto auf <b>Speichern</b> oder speichere alle auf einmal als .zip.'] },
        { h: 'Bleibt die Qualität gleich?' },
        'Das Foto sieht gleich aus. JPG-Dateien sind etwas größer als HEIC, das ist der Preis dafür, dass sie überall lesbar sind. Müssen sie kleiner sein, etwa für ein Formular mit Größenlimit, nutze danach <a href="{t:compress-image}">Bild komprimieren</a>.',
        { h: 'Standort und andere versteckte Daten' },
        'Handyfotos speichern meist, wo sie aufgenommen wurden. Wenn du sie mit Fremden teilst, lass sie auch durch <a href="{t:remove-photo-location}">Standort aus Fotos entfernen</a> laufen.',
        { h: 'Dem iPhone HEIC abgewöhnen' },
        'Geh auf dem iPhone zu Einstellungen › Kamera › Formate und wähle <b>Maximale Kompatibilität</b>. Neue Fotos werden dann als JPG gespeichert. Bereits aufgenommene Fotos bleiben HEIC.'
      ]
    },
    email: {
      slug: 'pdf-klein-genug-fuer-e-mail', title: 'Ein PDF klein genug für eine E-Mail machen · LunaVerta',
      desc: 'PDF zu groß für den Anhang? Die meisten E-Mail-Dienste stoppen bei 20–25 MB. So machst du es kleiner, kostenlos und ohne es irgendwo hochzuladen.',
      h1: 'Ein PDF klein genug für eine E-Mail machen', lead: 'Dein PDF ist zu groß für den Anhang. Die meisten E-Mail-Dienste stoppen bei 20 bis 25 MB, manche Firmen haben ein noch niedrigeres Limit. So machst du es klein genug.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF komprimieren</a> und wähle das PDF.', 'Jede Seite wird kompakter neu gezeichnet. Der Text bleibt durchsuchbar und kopierbar.', 'Du siehst, wie viel kleiner es geworden ist. Klicke auf <b>Speichern</b>.', 'Konnte es nicht kleiner werden, bekommst du dein Original unverändert zurück.'] },
        { h: 'Was PDFs groß macht' },
        'Fast immer Bilder: Scans, Fotos und Handyaufnahmen von Papier. Ein Scan mit 30 Seiten hat schnell 40 MB; nach dem Komprimieren oft nur noch wenige MB. PDFs mit überwiegend getipptem Text sind meist schon klein, dort bringt Komprimieren wenig.',
        { h: 'Immer noch zu groß?' },
        { ul: ['Teile es auf: <a href="{t:split-pdf}">PDF teilen</a> macht eine Datei pro Seite, und mit <a href="{t:extract-pages}">PDF-Seiten extrahieren</a> schickst du nur die Seiten, auf die es ankommt.', 'Schick es in Teilen, ein Anhang pro E-Mail.'] },
        { h: 'Wann du nicht komprimieren solltest' },
        'Beim Komprimieren werden die Seiten zu Bildern, auf denen der Text erhalten bleibt; Links und ausfüllbare Formularfelder gehen dabei verloren. Muss der Empfänger das Formular ausfüllen oder unterschreiben, schick das Original.'
      ]
    },
    gps: {
      slug: 'standort-vor-dem-teilen-aus-fotos-entfernen', title: 'Standort aus Fotos entfernen, bevor du sie teilst oder verkaufst · LunaVerta',
      desc: 'Handyfotos verraten oft, wo sie aufgenommen wurden, auch dein Zuhause. Entferne den GPS-Standort und andere versteckte Daten, bevor du teilst oder online verkaufst. Kostenlos und privat.',
      h1: 'Standort aus Fotos entfernen, bevor du sie teilst', lead: 'Die meisten Handyfotos speichern still und leise, wo sie aufgenommen wurden. Ein Foto vom Sofa, das du verkaufst, kann einem Fremden verraten, wo du wohnst. So entfernst du das vor dem Teilen.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">Standort aus Fotos entfernen</a>.', 'Wähle deine Fotos oder zieh sie auf die Seite.', 'Standort, Kameradaten, Datum und andere versteckte Daten werden entfernt. Das Bild selbst bleibt unberührt, es gibt also keinen Qualitätsverlust.', 'Speichere die bereinigten Fotos und teile diese statt der Originale.'] },
        { h: 'Entfernt die Website das nicht sowieso?' },
        'Manche großen Plattformen entfernen den Standort beim Hochladen, aber man sieht es nicht immer, und Fotos, die per E-Mail, als Datei im Chat oder auf einem USB-Stick verschickt werden, behalten ihn meist. Wenn du sie vorher bereinigst, musst du dich auf niemanden verlassen.',
        { h: 'Für künftige Fotos abschalten' },
        { ul: ['iPhone: Einstellungen › Datenschutz & Sicherheit › Ortungsdienste › Kamera › Nie.', 'Android: Öffne die Kamera-App, geh in ihre Einstellungen und schalte die Standort-Tags aus (der Name unterscheidet sich je nach Handy).'] }
      ]
    },
    word: {
      slug: 'pdf-in-word-layout-behalten', title: 'PDF in Word umwandeln und das Layout behalten – kostenlos und privat · LunaVerta',
      desc: 'Wandle ein PDF in ein bearbeitbares Word-Dokument um, das Schriften, Fettdruck, Ausrichtung und Bilder behält. Kostenlos, ohne Konto, und das PDF verlässt nie dein Gerät.',
      h1: 'PDF in Word umwandeln und das Layout behalten', lead: 'Du musst ein Dokument ändern, das du nur als PDF hast. So machst du daraus eine Word-Datei, die du bearbeiten kannst, mit Schriften, Fettdruck, Ausrichtung und Bildern.',
      body: [
        { h: 'Schritt für Schritt' },
        { ol: ['Öffne <a href="{tool}">PDF in Word</a> und wähle das PDF.', 'Der Text jeder Seite wird gelesen und zu einer .docx-Datei aufgebaut, mit Absätzen, Schriften, Größen, Fett und Kursiv, Ausrichtung und Bildern.', 'Klicke auf <b>Speichern</b>.', 'Öffne sie in Word, Pages, LibreOffice oder Google Docs und bearbeite sie.'] },
        { h: 'Nur ein paar Wörter korrigieren?' },
        'Dann brauchst du vielleicht gar kein Word. Mit <a href="{t:edit-pdf}">PDF bearbeiten</a> korrigierst du den Text direkt im PDF, in seiner eigenen Schrift, und der Rest der Seite bleibt genau, wie er war.',
        { h: 'Gescannte PDFs' },
        'Ein Scan ist ein Bild von Papier, es gibt also keinen Text zum Lesen. Lass ihn zuerst durch <a href="{t:ocr}">OCR: PDF durchsuchbar machen</a> laufen und wandle das Ergebnis dann in Word um.',
        { h: 'Was nicht mitkommt' },
        'Komplizierte Layouts, etwa Text in vielen Spalten, mit Linien gezeichnete Tabellen oder Text über Bildern, brauchen in Word danach eventuell etwas Nacharbeit.'
      ]
    }
  }
};

// Spanish and French live in their own file to keep this one readable.
import { GUIDE_INDEX_ESFR, GUIDE_TEXT_ESFR } from './guides-esfr.mjs';
Object.assign(GUIDE_INDEX_EXTRA, GUIDE_INDEX_ESFR);
Object.assign(GUIDE_TEXT, GUIDE_TEXT_ESFR);

// The other languages of the guides in guides-more.mjs.
import { MORE } from './guides-more.mjs';
for (const g of MORE) for (const L of ['sv', 'no', 'de', 'es', 'fr']) GUIDE_TEXT[L][g.id] = g[L];
