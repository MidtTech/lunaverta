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
  }
];
