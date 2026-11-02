// Short guides for everyday jobs, written for what people search for. English and Danish.
// Each guide points to the tool that does the job. Body: paragraphs (strings) and lists ({ ol: [...] } / { ul: [...] }).
export const GUIDE_INDEX = {
  en: { slug: 'guide', title: 'Guides: everyday PDF jobs, done privately · LunaVerta', desc: 'Short guides for common jobs: removing a CPR number, sharing a payslip safely, signing a lease without printing, and collecting receipts in one PDF.', h1: 'Guides', lead: 'Short, practical guides for the jobs people most often need to do with their documents. Everything happens on your own device.', read: 'Read the guide', open: 'Open the tool', all: 'All guides', guides: 'Guides' },
  da: { slug: 'guide', title: 'Vejledninger: hverdagens PDF-opgaver, helt privat · LunaVerta', desc: 'Korte vejledninger til hverdagens opgaver: fjern et CPR-nummer, send en lønseddel sikkert, underskriv en lejekontrakt uden at printe, og saml kvitteringer i én PDF.', h1: 'Vejledninger', lead: 'Korte, praktiske vejledninger til de opgaver, folk oftest skal løse med deres dokumenter. Alt foregår på din egen enhed.', read: 'Læs vejledningen', open: 'Åbn værktøjet', all: 'Alle vejledninger', guides: 'Vejledninger' }
};

export const GUIDES = [
  {
    id: 'cpr', tool: 'redact-pdf',
    en: {
      slug: 'remove-cpr-number-from-pdf', title: 'Remove a CPR number from a PDF, free and without uploading · LunaVerta',
      desc: 'How to remove your CPR number (Danish personal ID number) from a PDF for good, so it cannot be copied or found. Free, and the file never leaves your device.',
      h1: 'Remove a CPR number from a PDF', lead: 'A CPR number on a document you share can be misused. Here is how to remove it properly, so it is really gone from the file and not just hidden.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Anonymise PDF</a> and choose your PDF.', 'LunaVerta looks through every page and marks CPR numbers in yellow, along with other things people usually remove, such as account numbers, e-mails and phone numbers.', 'If you only want to remove the CPR number, switch the other categories off. Tap a marking to keep that piece of text.', 'Click <b>Remove … and save new version</b>. The marked text is deleted from the file, and a copy is saved on your device. Your original is not changed.'] },
        { h: 'Why a black box in Word or a PDF reader is not enough' },
        'Drawing a black rectangle over a number usually only covers it. The text is still underneath, and anyone can copy it out or find it with a search. LunaVerta deletes the letters themselves, so there is nothing left to copy.',
        { h: 'Check the result' },
        'Open the saved PDF, press Ctrl+F (or Cmd+F on a Mac) and search for the first digits of the number. Nothing should be found.',
        { h: 'Scanned documents' },
        'If the PDF is a scan (a picture of paper), there is no text to search. Use <b>Black out</b> in the same window and drag a box over the number yourself; it is burned into the picture when you save.'
      ]
    },
    da: {
      slug: 'fjern-cpr-nummer-fra-pdf', title: 'Fjern CPR-nummer fra en PDF – gratis og uden upload · LunaVerta',
      desc: 'Sådan fjerner du dit CPR-nummer fra en PDF for altid, så det ikke kan kopieres eller findes. Gratis, og filen forlader aldrig din enhed.',
      h1: 'Fjern et CPR-nummer fra en PDF', lead: 'Et CPR-nummer på et dokument, du deler, kan misbruges. Sådan fjerner du det ordentligt, så det faktisk er væk fra filen og ikke bare skjult.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Anonymisér PDF</a>, og vælg din PDF.', 'LunaVerta gennemgår alle sider og markerer CPR-numre med gult, sammen med andet, man som regel fjerner, fx kontonumre, e-mails og telefonnumre.', 'Vil du kun fjerne CPR-nummeret, så slå de andre kategorier fra. Tryk på en markering for at beholde netop den tekst.', 'Klik på <b>Fjern … og gem ny version</b>. Den markerede tekst slettes fra filen, og en kopi gemmes på din enhed. Din original bliver ikke ændret.'] },
        { h: 'Hvorfor en sort boks i Word eller en PDF-læser ikke er nok' },
        'Tegner du et sort felt over et nummer, dækker det som regel bare. Teksten ligger stadig nedenunder, og alle kan kopiere den ud eller finde den med en søgning. LunaVerta sletter selve bogstaverne, så der intet er at kopiere.',
        { h: 'Tjek resultatet' },
        'Åbn den gemte PDF, tryk Ctrl+F (eller Cmd+F på en Mac), og søg efter de første cifre i nummeret. Der skal ikke findes noget.',
        { h: 'Scannede dokumenter' },
        'Er PDF\'en en scanning (et billede af papir), er der ingen tekst at søge i. Brug <b>Anonymisér</b> i samme vindue, og træk selv et felt hen over nummeret; det brændes ind i billedet, når du gemmer.'
      ]
    }
  },
  {
    id: 'payslip', tool: 'redact-pdf',
    en: {
      slug: 'share-payslip-safely', title: 'Share a payslip safely, without your CPR and account number · LunaVerta',
      desc: 'A landlord, bank or new employer asks for your payslip? Remove your CPR number, account number and other details first. Free and private.',
      h1: 'Share a payslip safely', lead: 'Landlords, banks and new employers often ask to see a payslip. They need your income, not your CPR number or bank account. Here is how to send only what they need.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Anonymise PDF</a> and choose the payslip.', 'Your CPR number, account numbers, e-mail and phone number are found and marked in yellow.', 'Keep what the receiver needs to see. If the pay amounts are marked, switch the Prices category off so they stay.', 'Click <b>Remove … and save new version</b>, and send the saved copy.'] },
        { h: 'What to remove, and what to keep' },
        { ul: ['Remove: CPR number, bank account and registration number, tax card details you were not asked for, your home address if the receiver already has it.', 'Keep: your name, the employer, the period and the pay amounts. That is usually what the receiver needs to check.'] },
        { h: 'Several months?' },
        'If you are asked for three months, anonymise each payslip, then put them together with <a href="{merge}">Merge PDF</a> so you only send one file.'
      ]
    },
    da: {
      slug: 'send-loenseddel-sikkert', title: 'Send en lønseddel sikkert – uden CPR- og kontonummer · LunaVerta',
      desc: 'Beder udlejer, bank eller ny arbejdsgiver om din lønseddel? Fjern først CPR-nummer, kontonummer og andre oplysninger. Gratis og privat.',
      h1: 'Send en lønseddel sikkert', lead: 'Udlejere, banker og nye arbejdsgivere beder tit om at se en lønseddel. De skal bruge din indkomst, ikke dit CPR-nummer eller din bankkonto. Sådan sender du kun det, de har brug for.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Anonymisér PDF</a>, og vælg lønsedlen.', 'Dit CPR-nummer, kontonumre, e-mail og telefonnummer bliver fundet og markeret med gult.', 'Behold det, modtageren skal se. Er lønbeløbene markeret, så slå kategorien Priser fra, så de bliver stående.', 'Klik på <b>Fjern … og gem ny version</b>, og send den gemte kopi.'] },
        { h: 'Hvad skal væk, og hvad skal blive' },
        { ul: ['Fjern: CPR-nummer, kontonummer og reg.nr., skattekortoplysninger, du ikke er blevet bedt om, og din adresse, hvis modtageren allerede har den.', 'Behold: dit navn, arbejdsgiveren, perioden og lønbeløbene. Det er som regel det, modtageren skal tjekke.'] },
        { h: 'Flere måneder?' },
        'Bliver du bedt om tre måneder, så anonymisér hver lønseddel og saml dem bagefter med <a href="{merge}">Saml PDF</a>, så du kun sender én fil.'
      ]
    }
  },
  {
    id: 'lease', tool: 'sign-pdf',
    en: {
      slug: 'sign-lease-without-printing', title: 'Sign a rental contract without printing it · LunaVerta',
      desc: 'Sign a lease or other contract as a PDF: draw your signature, place it, add the date and send it back. No printer, no scanner, no upload.',
      h1: 'Sign a rental contract without printing', lead: 'You have received a lease as a PDF and need to sign it. You do not need a printer and a scanner: you can sign it on your computer or phone in a minute.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Sign PDF</a> and choose the contract.', 'Draw your signature with the mouse or your finger. Tick <b>Add today’s date under the signature</b> if you want the date there.', 'Click <b>Place on page</b>, then click where the signature should go. Go to other pages and click again if they also need signing or initials.', 'Click <b>Save PDF</b>, and send the signed copy back.'] },
        { h: 'Is a drawn signature valid?' },
        'A drawn signature on a PDF is a simple electronic signature. Many landlords and companies accept it for leases and everyday contracts, but some documents require a stronger signature such as MitID. If you are unsure, ask the person who sent you the contract whether they accept it. This is not legal advice.',
        { h: 'Signing often?' },
        'Tick <b>Remember on this device</b>, and it is stored on your own device, ready for next time. It is never sent anywhere.'
      ]
    },
    da: {
      slug: 'underskriv-lejekontrakt-uden-at-printe', title: 'Underskriv en lejekontrakt uden at printe · LunaVerta',
      desc: 'Underskriv en lejekontrakt eller anden aftale som PDF: tegn din underskrift, placér den, tilføj datoen og send den retur. Ingen printer, ingen scanner, ingen upload.',
      h1: 'Underskriv en lejekontrakt uden at printe', lead: 'Du har fået en lejekontrakt som PDF og skal skrive under. Du behøver ikke printer og scanner: du kan underskrive den på computeren eller telefonen på et minut.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Underskriv PDF</a>, og vælg kontrakten.', 'Tegn din underskrift med musen eller fingeren. Sæt flueben i <b>Tilføj dags dato under underskriften</b>, hvis datoen skal med.', 'Klik på <b>Placér på siden</b>, og klik derefter, hvor underskriften skal stå. Gå til andre sider og klik igen, hvis de også skal underskrives eller have initialer.', 'Klik på <b>Gem PDF</b>, og send den underskrevne kopi retur.'] },
        { h: 'Er en tegnet underskrift gyldig?' },
        'En tegnet underskrift på en PDF er en simpel elektronisk signatur. Mange udlejere og virksomheder accepterer den til lejekontrakter og almindelige aftaler, men nogle dokumenter kræver en stærkere signatur, fx MitID. Er du i tvivl, så spørg den, der har sendt dig kontrakten, om de accepterer den. Dette er ikke juridisk rådgivning.',
        { h: 'Skriver du tit under?' },
        'Sæt flueben i <b>Husk på denne enhed</b>, så gemmes den på din egen enhed og er klar næste gang. Den sendes aldrig nogen steder hen.'
      ]
    }
  },
  {
    id: 'receipts', tool: 'scan-to-pdf',
    en: {
      slug: 'combine-receipts-into-one-pdf', title: 'Collect receipts in one PDF for insurance, expenses or tax · LunaVerta',
      desc: 'Photograph your receipts and turn them into one tidy, searchable PDF for an insurance claim, an expense report or your tax return. Free and private.',
      h1: 'Collect receipts in one PDF', lead: 'Insurance claims, expense reports and tax deductions often need the receipts as one file. Here is how to go from a pile of paper to one tidy PDF, using just your phone.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Scan to PDF</a> on your phone and take a photo of the first receipt.', 'The edges are found and the receipt is straightened, like a real scan. Click <b>Add a page</b> and photograph the next one. Repeat for all of them.', 'Tick <b>Make the text searchable</b>, so you can search the amounts later.', 'Click <b>Make PDF</b>, then <b>Save</b>. All the receipts are now one file.'] },
        { h: 'Some receipts are already PDFs?' },
        'Save your scan, then put it together with the other PDFs in <a href="{merge}">Merge PDF</a>.',
        { h: 'Too big to e-mail?' },
        'Many mail services stop at 20–25 MB. <a href="{compress}">Compress PDF</a> makes the file smaller without making the receipts hard to read.'
      ]
    },
    da: {
      slug: 'saml-kvitteringer-i-en-pdf', title: 'Saml kvitteringer i én PDF – til forsikring, udlæg eller skat · LunaVerta',
      desc: 'Tag billeder af dine kvitteringer, og lav dem til én pæn, søgbar PDF til en forsikringssag, en udlægsrapport eller selvangivelsen. Gratis og privat.',
      h1: 'Saml kvitteringer i én PDF', lead: 'Forsikringssager, udlæg og fradrag kræver tit kvitteringerne som én fil. Sådan kommer du fra en bunke papir til én pæn PDF med kun din telefon.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Scan til PDF</a> på telefonen, og tag et billede af den første kvittering.', 'Kanterne bliver fundet, og kvitteringen rettes op som en rigtig scanning. Klik på <b>Tilføj en side</b>, og fotografér den næste. Gentag for dem alle.', 'Sæt flueben i <b>Gør teksten søgbar</b>, så du senere kan søge efter beløbene.', 'Klik på <b>Lav PDF</b> og derefter <b>Gem</b>. Nu er alle kvitteringerne én fil.'] },
        { h: 'Er nogle kvitteringer allerede PDF\'er?' },
        'Gem din scanning, og saml den derefter med de andre PDF\'er i <a href="{merge}">Saml PDF</a>.',
        { h: 'For stor til at sende på mail?' },
        'Mange mailtjenester stopper ved 20–25 MB. <a href="{compress}">Komprimér PDF</a> gør filen mindre, uden at kvitteringerne bliver svære at læse.'
      ]
    }
  },
  {
    id: 'heic', tool: 'heic-to-jpg',
    en: {
      slug: 'iphone-photos-heic-to-jpg', title: 'iPhone photos (HEIC) to JPG, free and without uploading · LunaVerta',
      desc: 'Your iPhone photos are .HEIC files that Windows and many websites cannot open? Turn them into ordinary JPG photos in seconds, on your own device.',
      h1: 'Turn iPhone photos (HEIC) into JPG', lead: 'iPhones save photos as HEIC to save space. That is fine on the phone, but many Windows PCs, websites and forms will not take them. Here is how to turn them into ordinary JPG photos.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">HEIC to JPG</a>.', 'Choose your HEIC photos, or drop them on the page. You can take many at once.', 'They are turned into JPG straight away, on your device.', 'Click <b>Save</b> on each one, or save them all at once as a .zip.'] },
        { h: 'Is the quality the same?' },
        'The photo looks the same. JPG files are a bit bigger than HEIC, which is the price of being readable everywhere. If you need them smaller, for example for a web form with a size limit, use <a href="{t:compress-image}">Compress image</a> afterwards.',
        { h: 'Location and other hidden data' },
        'Photos from a phone usually carry the place they were taken. If you are sharing them with strangers, run them through <a href="{t:remove-photo-location}">Remove photo location</a> as well.',
        { h: 'Stop the iPhone making HEIC' },
        'On the iPhone, go to Settings › Camera › Formats and choose <b>Most Compatible</b>. New photos are then saved as JPG. Photos you have already taken stay HEIC.'
      ]
    },
    da: {
      slug: 'iphone-billeder-heic-til-jpg', title: 'iPhone-billeder (HEIC) til JPG – gratis og uden upload · LunaVerta',
      desc: 'Er dine iPhone-billeder .HEIC-filer, som Windows og mange hjemmesider ikke kan åbne? Lav dem om til almindelige JPG-billeder på få sekunder, på din egen enhed.',
      h1: 'Lav iPhone-billeder (HEIC) om til JPG', lead: 'iPhones gemmer billeder som HEIC for at spare plads. Det går fint på telefonen, men mange Windows-computere, hjemmesider og formularer vil ikke tage imod dem. Sådan laver du dem om til almindelige JPG-billeder.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">HEIC til JPG</a>.', 'Vælg dine HEIC-billeder, eller slip dem på siden. Du kan tage mange på én gang.', 'De bliver lavet om til JPG med det samme, på din enhed.', 'Klik på <b>Gem</b> ved hvert billede, eller gem dem alle på én gang som .zip.'] },
        { h: 'Er kvaliteten den samme?' },
        'Billedet ser ens ud. JPG-filer er lidt større end HEIC, og det er prisen for, at de kan læses alle steder. Skal de være mindre, fx til en formular med en størrelsesgrænse, så brug <a href="{t:compress-image}">Komprimér billede</a> bagefter.',
        { h: 'Placering og andre skjulte data' },
        'Billeder fra en telefon gemmer som regel, hvor de er taget. Deler du dem med fremmede, så kør dem også gennem <a href="{t:remove-photo-location}">Fjern GPS fra billeder</a>.',
        { h: 'Få iPhonen til at holde op med at lave HEIC' },
        'Gå på iPhonen til Indstillinger › Kamera › Formater, og vælg <b>Mest kompatibel</b>. Nye billeder gemmes så som JPG. Billeder, du allerede har taget, forbliver HEIC.'
      ]
    }
  },
  {
    id: 'email', tool: 'compress-pdf',
    en: {
      slug: 'make-pdf-small-enough-to-email', title: 'Make a PDF small enough to e-mail · LunaVerta',
      desc: 'PDF too big to attach? Most mail services stop at 20–25 MB. Here is how to make it smaller, free and without uploading it anywhere.',
      h1: 'Make a PDF small enough to e-mail', lead: 'Your PDF is too big to attach. Most mail services stop at 20 to 25 MB, and some companies set an even lower limit. Here is how to make it small enough.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Compress PDF</a> and choose the PDF.', 'Every page is redrawn more compactly. The text stays searchable and can still be copied.', 'You see how much smaller it became. Click <b>Save</b>.', 'If it could not get smaller, you get your original back unchanged.'] },
        { h: 'What makes PDFs big' },
        'Almost always pictures: scans, photos and phone snaps of paper. A 30-page scan can easily be 40 MB; after compressing it is often a few MB. PDFs that are mostly typed text are usually small already, and compressing them does little.',
        { h: 'Still too big?' },
        { ul: ['Split it: <a href="{t:split-pdf}">Split PDF</a> makes one file per page, and <a href="{t:extract-pages}">Extract pages</a> lets you send only the pages that matter.', 'Send it in parts, one attachment per e-mail.'] },
        { h: 'When not to compress' },
        'Compressing turns the pages into pictures with the text kept on top, so links and fillable form fields are not kept. If the receiver has to fill in or sign the form, send the original.'
      ]
    },
    da: {
      slug: 'goer-pdf-lille-nok-til-mail', title: 'Gør en PDF lille nok til at sende på mail · LunaVerta',
      desc: 'Er PDF\'en for stor til at vedhæfte? De fleste mailtjenester stopper ved 20–25 MB. Sådan gør du den mindre, gratis og uden at uploade den nogen steder.',
      h1: 'Gør en PDF lille nok til mail', lead: 'Din PDF er for stor til at vedhæfte. De fleste mailtjenester stopper ved 20 til 25 MB, og nogle virksomheder har en endnu lavere grænse. Sådan gør du den lille nok.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Komprimér PDF</a>, og vælg PDF\'en.', 'Hver side bliver tegnet mere kompakt. Teksten kan stadig søges i og kopieres.', 'Du kan se, hvor meget mindre den er blevet. Klik på <b>Gem</b>.', 'Kunne den ikke blive mindre, får du din original tilbage uændret.'] },
        { h: 'Hvad gør PDF\'er store' },
        'Næsten altid billeder: scanninger, fotos og mobilbilleder af papir. En scanning på 30 sider kan sagtens fylde 40 MB; efter komprimering er den ofte nede på få MB. PDF\'er med mest skrevet tekst er som regel små i forvejen, og komprimering gør ikke meget.',
        { h: 'Stadig for stor?' },
        { ul: ['Del den op: <a href="{t:split-pdf}">Del PDF</a> laver én fil pr. side, og <a href="{t:extract-pages}">Udtræk sider</a> lader dig sende kun de sider, der betyder noget.', 'Send den i dele, én vedhæftning pr. mail.'] },
        { h: 'Hvornår du ikke skal komprimere' },
        'Komprimering laver siderne om til billeder med teksten bevaret ovenpå, så links og udfyldelige formularfelter forsvinder. Skal modtageren udfylde eller underskrive formularen, så send originalen.'
      ]
    }
  },
  {
    id: 'gps', tool: 'remove-photo-location',
    en: {
      slug: 'remove-location-before-sharing-photos', title: 'Remove the location from photos before you share or sell · LunaVerta',
      desc: 'Phone photos often reveal where they were taken, including your home. Remove the GPS location and other hidden data before you share or sell online. Free and private.',
      h1: 'Remove the location from photos before you share them', lead: 'Most phone photos quietly record where they were taken. A photo of the sofa you are selling can tell a stranger where you live. Here is how to remove that before you share.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">Remove photo location</a>.', 'Choose your photos, or drop them on the page.', 'The location, camera details, dates and other hidden data are removed. The picture itself is not touched, so there is no loss of quality.', 'Save the cleaned photos and share those instead of the originals.'] },
        { h: 'Doesn\'t the website remove it anyway?' },
        'Some big sites remove the location when you upload, but you cannot always tell, and photos sent by e-mail, as files in a chat or on a USB stick usually keep it. Cleaning them first means you do not have to rely on anyone else.',
        { h: 'Turn it off for future photos' },
        { ul: ['iPhone: Settings › Privacy & Security › Location Services › Camera › Never.', 'Android: open the Camera app, go to its settings and switch off location tags (the name varies by phone).'] }
      ]
    },
    da: {
      slug: 'fjern-placering-foer-du-deler-billeder', title: 'Fjern placeringen fra billeder, før du deler eller sælger · LunaVerta',
      desc: 'Mobilbilleder afslører tit, hvor de er taget, også dit hjem. Fjern GPS-placeringen og andre skjulte data, før du deler eller sælger på nettet. Gratis og privat.',
      h1: 'Fjern placeringen fra billeder, før du deler dem', lead: 'De fleste mobilbilleder gemmer i det stille, hvor de er taget. Et billede af sofaen, du sælger, kan fortælle en fremmed, hvor du bor. Sådan fjerner du det, før du deler.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">Fjern GPS fra billeder</a>.', 'Vælg dine billeder, eller slip dem på siden.', 'Placering, kameraoplysninger, datoer og andre skjulte data fjernes. Selve billedet røres ikke, så kvaliteten er den samme.', 'Gem de rensede billeder, og del dem i stedet for originalerne.'] },
        { h: 'Fjerner hjemmesiden det ikke alligevel?' },
        'Nogle store sider fjerner placeringen, når du uploader, men du kan ikke altid se det, og billeder sendt på mail, som filer i en chat eller på en USB-nøgle beholder den som regel. Renser du dem først, behøver du ikke stole på andre.',
        { h: 'Slå det fra for fremtidige billeder' },
        { ul: ['iPhone: Indstillinger › Anonymitet & sikkerhed › Lokalitetstjenester › Kamera › Aldrig.', 'Android: åbn Kamera-appen, gå til dens indstillinger, og slå placeringsmærker fra (navnet varierer fra telefon til telefon).'] }
      ]
    }
  },
  {
    id: 'word', tool: 'pdf-to-word',
    en: {
      slug: 'pdf-to-word-keep-layout', title: 'PDF to Word that keeps the layout, free and private · LunaVerta',
      desc: 'Turn a PDF into an editable Word document that keeps fonts, bold text, alignment and pictures. Free, no account, and the PDF never leaves your device.',
      h1: 'Turn a PDF into Word and keep the layout', lead: 'You need to change a document you only have as a PDF. Here is how to turn it into a Word file you can edit, with the fonts, bold text, alignment and pictures kept.',
      body: [
        { h: 'Step by step' },
        { ol: ['Open <a href="{tool}">PDF to Word</a> and choose the PDF.', 'The text on each page is read and built into a .docx file, with paragraphs, fonts, sizes, bold and italic, alignment and pictures.', 'Click <b>Save</b>.', 'Open it in Word, Pages, LibreOffice or Google Docs and edit away.'] },
        { h: 'Only need to fix a few words?' },
        'Then you may not need Word at all. <a href="{t:edit-pdf}">Edit PDF</a> lets you correct text directly in the PDF, in its own font, and the rest of the page stays exactly as it was.',
        { h: 'Scanned PDFs' },
        'A scan is a picture of paper, so there is no text to read. Run it through <a href="{t:ocr}">OCR: make a PDF searchable</a> first, then convert the result to Word.',
        { h: 'What does not carry over' },
        'Complicated layouts, such as text in many columns, tables drawn with lines, or text on top of pictures, may need some tidying in Word afterwards.'
      ]
    },
    da: {
      slug: 'pdf-til-word-behold-layout', title: 'PDF til Word der beholder layoutet – gratis og privat · LunaVerta',
      desc: 'Lav en PDF om til et redigerbart Word-dokument, der beholder skrifttyper, fed tekst, justering og billeder. Gratis, ingen konto, og PDF\'en forlader aldrig din enhed.',
      h1: 'Lav en PDF om til Word og behold layoutet', lead: 'Du skal ændre et dokument, du kun har som PDF. Sådan laver du det om til en Word-fil, du kan redigere, med skrifttyper, fed tekst, justering og billeder bevaret.',
      body: [
        { h: 'Trin for trin' },
        { ol: ['Åbn <a href="{tool}">PDF til Word</a>, og vælg PDF\'en.', 'Teksten på hver side bliver læst og bygget til en .docx-fil med afsnit, skrifttyper, størrelser, fed og kursiv, justering og billeder.', 'Klik på <b>Gem</b>.', 'Åbn den i Word, Pages, LibreOffice eller Google Docs, og ret løs.'] },
        { h: 'Skal du bare rette et par ord?' },
        'Så behøver du måske slet ikke Word. Med <a href="{t:edit-pdf}">Redigér PDF</a> retter du teksten direkte i PDF\'en, i dens egen skrift, og resten af siden bliver præcis, som den var.',
        { h: 'Scannede PDF\'er' },
        'En scanning er et billede af papir, så der er ingen tekst at læse. Kør den først gennem <a href="{t:ocr}">OCR: gør en PDF søgbar</a>, og lav derefter resultatet om til Word.',
        { h: 'Det, der ikke kommer med' },
        'Komplicerede layouts, fx tekst i mange spalter, tabeller tegnet med streger eller tekst oven på billeder, kan kræve lidt oprydning i Word bagefter.'
      ]
    }
  }
];
