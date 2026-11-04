// The guides in Spanish and French, adapted to each country (DNI/NIE and Seguridad Social;
// numéro de sécurité sociale and numéro fiscal). Same structure as guides-extra.mjs, merged there.
export const GUIDE_INDEX_ESFR = {
  es: { slug: 'guias', title: 'Guías: tareas cotidianas con PDF, totalmente privadas · LunaVerta', desc: 'Guías breves para tareas habituales: quitar el DNI de un PDF, enviar una nómina con seguridad, firmar un contrato de alquiler sin imprimir, juntar tickets en un PDF y más.', h1: 'Guías', lead: 'Guías breves y prácticas para las tareas que más a menudo hay que hacer con los documentos. Todo ocurre en tu propio dispositivo.', read: 'Leer la guía', open: 'Abrir la herramienta', all: 'Todas las guías', guides: 'Guías' },
  fr: { slug: 'guides', title: 'Guides : les tâches PDF du quotidien, en toute confidentialité · LunaVerta', desc: 'Des guides courts pour les tâches courantes : retirer un numéro de sécurité sociale d\'un PDF, envoyer une fiche de paie en sécurité, signer un bail sans imprimante, réunir des tickets dans un PDF, et plus.', h1: 'Guides', lead: 'Des guides courts et pratiques pour les tâches qu\'on doit le plus souvent faire avec ses documents. Tout se passe sur votre propre appareil.', read: 'Lire le guide', open: 'Ouvrir l\'outil', all: 'Tous les guides', guides: 'Guides' }
};

export const GUIDE_TEXT_ESFR = {
  // ---------------------------------------------------------------- Spanish
  es: {
    cpr: {
      slug: 'quitar-dni-de-pdf', title: 'Quitar el DNI o el número de la Seguridad Social de un PDF · LunaVerta',
      desc: 'Cómo quitar para siempre el DNI, el NIE, el número de la Seguridad Social y otros números de identificación de un PDF, para que no se puedan copiar ni encontrar. Gratis, y el archivo nunca sale de tu dispositivo.',
      h1: 'Quitar el DNI o el número de la Seguridad Social de un PDF', lead: 'Un DNI o un número de la Seguridad Social en un documento que compartes se puede usar mal. Así lo quitas bien, para que desaparezca de verdad del archivo y no solo quede tapado.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Anonimizar PDF</a> y elige tu PDF.', 'LunaVerta revisa cada página y marca en amarillo los números de identificación, junto con otros datos que se suelen quitar, como IBAN, correos y teléfonos.', 'Si solo quieres quitar el número de identificación, desactiva las demás categorías. Toca una marca para conservar justo ese texto.', 'Haz clic en <b>Eliminar … y guardar nueva versión</b>. El texto marcado se borra del archivo y se guarda una copia en tu dispositivo. El original no cambia.'] },
        { h: 'Por qué no basta con un recuadro negro en Word o en el lector de PDF' },
        'Un rectángulo negro sobre un número normalmente solo lo tapa. El texto sigue debajo, y cualquiera puede copiarlo o encontrarlo con una búsqueda. LunaVerta borra los propios caracteres, así que no queda nada que copiar.',
        { h: 'Comprobar el resultado' },
        'Abre el PDF guardado, pulsa Ctrl+F (o Cmd+F en el Mac) y busca las primeras cifras del número. No debe encontrarse nada.',
        { h: 'Documentos escaneados' },
        'Si el PDF es un escaneo (una imagen del papel), no hay texto que buscar. Usa <b>Tapar</b> en la misma ventana y arrastra tú un recuadro sobre el número; al guardar se incrusta en la imagen.'
      ]
    },
    payslip: {
      slug: 'compartir-nomina-con-seguridad', title: 'Compartir la nómina con seguridad, sin DNI ni cuenta bancaria · LunaVerta',
      desc: '¿El casero, el banco o una nueva empresa quieren ver tu nómina? Quita antes el DNI, el número de la Seguridad Social, el IBAN y otros datos. Gratis y privado.',
      h1: 'Compartir la nómina con seguridad', lead: 'Caseros, bancos y nuevas empresas suelen pedir una nómina. Necesitan ver tus ingresos, no tu DNI ni tu cuenta bancaria. Así envías solo lo que necesitan.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Anonimizar PDF</a> y elige la nómina.', 'El DNI, el número de la Seguridad Social, el IBAN, el correo y el teléfono se encuentran y se marcan en amarillo.', 'Conserva lo que el destinatario tiene que ver. Si están marcados los importes del sueldo, desactiva la categoría Precios para que se queden.', 'Haz clic en <b>Eliminar … y guardar nueva versión</b> y envía la copia guardada.'] },
        { h: 'Qué quitar y qué dejar' },
        { ul: ['Quitar: el DNI o NIE, el número de la Seguridad Social, el IBAN, los datos de retención de IRPF que nadie te ha pedido y tu dirección, si el destinatario ya la tiene.', 'Dejar: tu nombre, la empresa, el periodo y los importes. Suele ser lo que el destinatario tiene que comprobar.'] },
        { h: '¿Varios meses?' },
        'Si te piden tres meses, anonimiza cada nómina y luego júntalas con <a href="{merge}">Unir PDF</a>, para enviar un solo archivo.'
      ]
    },
    lease: {
      slug: 'firmar-contrato-alquiler-sin-impresora', title: 'Firmar un contrato de alquiler sin impresora · LunaVerta',
      desc: 'Firma un contrato de alquiler u otro contrato en PDF: dibuja tu firma, colócala, añade la fecha y devuélvelo. Sin impresora, sin escáner y sin subir nada.',
      h1: 'Firmar un contrato de alquiler sin impresora', lead: 'Te han enviado un contrato de alquiler en PDF para firmar. No necesitas impresora ni escáner: puedes firmarlo en un minuto en el ordenador o en el móvil.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Firmar PDF</a> y elige el contrato.', 'Dibuja tu firma con el ratón o el dedo. Marca <b>Añadir la fecha de hoy bajo la firma</b> si quieres que aparezca la fecha.', 'Haz clic en <b>Colocar en la página</b> y luego donde deba ir la firma. Ve a otras páginas y vuelve a hacer clic si también hay que firmarlas o rubricarlas.', 'Haz clic en <b>Guardar PDF</b> y devuelve la copia firmada.'] },
        { h: '¿Es válida una firma dibujada?' },
        'Una firma dibujada en un PDF es una firma electrónica simple. Muchos caseros y empresas la aceptan, pero algunos contratos exigen una firma manuscrita o una firma electrónica cualificada, por ejemplo con certificado digital. Si tienes dudas, pregunta a quien te envió el contrato. Esto no es asesoramiento jurídico.',
        { h: '¿Firmas a menudo?' },
        'Marca <b>Recordar en este dispositivo</b> y la firma se guarda en tu propio dispositivo, lista para la próxima vez. Nunca se envía a ningún sitio.'
      ]
    },
    receipts: {
      slug: 'juntar-tickets-en-un-pdf', title: 'Juntar tickets y facturas en un PDF para el seguro, los gastos o la renta · LunaVerta',
      desc: 'Fotografía tus tickets y conviértelos en un PDF ordenado y buscable para el seguro, la nota de gastos o la declaración de la renta. Gratis y privado.',
      h1: 'Juntar tickets en un PDF', lead: 'Los partes al seguro, las notas de gastos y la renta suelen pedir los justificantes en un solo archivo. Así pasas de un montón de papeles a un PDF ordenado, solo con el móvil.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Escanear a PDF</a> en el móvil y fotografía el primer ticket.', 'Se encuentran los bordes y el ticket se endereza como en un escaneo de verdad. Haz clic en <b>Añadir una página</b> y fotografía el siguiente. Repite con todos.', 'Marca <b>Hacer el texto buscable (OCR)</b> para poder buscar importes más tarde.', 'Haz clic en <b>Crear PDF</b> y luego en <b>Guardar</b>. Ahora todos los tickets son un solo archivo.'] },
        { h: '¿Algunos justificantes ya son PDF?' },
        'Guarda tu escaneo y únelo con los demás PDF en <a href="{merge}">Unir PDF</a>.',
        { h: '¿Demasiado grande para un correo?' },
        'Muchos servicios de correo se paran en 20–25 MB. <a href="{compress}">Comprimir PDF</a> hace el archivo más pequeño sin que los tickets cuesten de leer.'
      ]
    },
    heic: {
      slug: 'fotos-iphone-heic-a-jpg', title: 'Convertir fotos del iPhone (HEIC) a JPG, gratis y sin subirlas · LunaVerta',
      desc: '¿Tus fotos del iPhone son archivos .HEIC que Windows y muchas webs no abren? Conviértelas en fotos JPG normales en segundos, en tu propio dispositivo.',
      h1: 'Convertir fotos del iPhone (HEIC) a JPG', lead: 'El iPhone guarda las fotos en HEIC para ahorrar espacio. En el móvil no es problema, pero muchos PC con Windows, webs y formularios no las aceptan. Así las conviertes en fotos JPG normales.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">HEIC a JPG</a>.', 'Elige tus fotos HEIC o arrástralas a la página. Puedes elegir muchas a la vez.', 'Se convierten a JPG al momento, en tu dispositivo.', 'Haz clic en <b>Guardar</b> en cada foto, o guárdalas todas a la vez en un .zip.'] },
        { h: '¿Se mantiene la calidad?' },
        'La foto se ve igual. Los JPG ocupan algo más que los HEIC; es el precio de que se puedan abrir en cualquier sitio. Si tienen que ser más pequeñas, por ejemplo para un formulario con límite de tamaño, usa después <a href="{t:compress-image}">Comprimir imagen</a>.',
        { h: 'Ubicación y otros datos ocultos' },
        'Las fotos del móvil suelen guardar dónde se hicieron. Si las compartes con desconocidos, pásalas también por <a href="{t:remove-photo-location}">Quitar la ubicación de fotos</a>.',
        { h: 'Que el iPhone deje de usar HEIC' },
        'En el iPhone, ve a Ajustes › Cámara › Formatos y elige <b>Más compatible</b>. Las fotos nuevas se guardarán en JPG. Las que ya tienes seguirán en HEIC.'
      ]
    },
    email: {
      slug: 'pdf-pequeno-para-correo', title: 'Hacer un PDF lo bastante pequeño para un correo · LunaVerta',
      desc: '¿PDF demasiado grande para adjuntarlo? La mayoría de servicios de correo se paran en 20–25 MB. Así lo haces más pequeño, gratis y sin subirlo a ningún sitio.',
      h1: 'Hacer un PDF lo bastante pequeño para un correo', lead: 'Tu PDF es demasiado grande para adjuntarlo. La mayoría de servicios de correo se paran en 20 a 25 MB, y algunas empresas tienen un límite aún menor. Así lo dejas lo bastante pequeño.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Comprimir PDF</a> y elige el PDF.', 'Cada página se vuelve a dibujar de forma más compacta. El texto se puede seguir buscando y copiando.', 'Ves cuánto más pequeño ha quedado. Haz clic en <b>Guardar</b>.', 'Si no se ha podido reducir, recibes tu original sin cambios.'] },
        { h: 'Qué hace grandes a los PDF' },
        'Casi siempre las imágenes: escaneos, fotos y fotos de papeles hechas con el móvil. Un escaneo de 30 páginas llega fácilmente a 40 MB; tras comprimirlo, a menudo se queda en pocos MB. Los PDF de texto escrito suelen ser ya pequeños, y comprimirlos ayuda poco.',
        { h: '¿Sigue siendo demasiado grande?' },
        { ul: ['Divídelo: <a href="{t:split-pdf}">Dividir PDF</a> crea un archivo por página, y con <a href="{t:extract-pages}">Extraer páginas de un PDF</a> envías solo las páginas que importan.', 'Envíalo por partes, un adjunto por correo.'] },
        { h: 'Cuándo no conviene comprimir' },
        'Al comprimir, las páginas se convierten en imágenes que conservan el texto; los enlaces y los campos de formulario rellenables se pierden. Si el destinatario tiene que rellenar o firmar el formulario, envía el original.'
      ]
    },
    gps: {
      slug: 'quitar-ubicacion-fotos-antes-de-compartir', title: 'Quitar la ubicación de las fotos antes de compartirlas o venderlas · LunaVerta',
      desc: 'Las fotos del móvil suelen revelar dónde se hicieron, también tu casa. Quita la ubicación GPS y otros datos ocultos antes de compartir o vender por internet. Gratis y privado.',
      h1: 'Quitar la ubicación de las fotos antes de compartirlas', lead: 'La mayoría de fotos del móvil guardan en silencio dónde se hicieron. La foto del sofá que vendes puede decirle a un desconocido dónde vives. Así lo quitas antes de compartir.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">Quitar la ubicación de fotos</a>.', 'Elige tus fotos o arrástralas a la página.', 'Se quitan la ubicación, los datos de la cámara, la fecha y otros datos ocultos. La imagen en sí no se toca, así que no pierde calidad.', 'Guarda las fotos limpias y comparte esas en lugar de las originales.'] },
        { h: '¿No lo quita ya la propia web?' },
        'Algunas plataformas grandes quitan la ubicación al subir, pero no siempre se ve, y las fotos que se envían por correo, como archivo en un chat o en un USB suelen conservarla. Si las limpias antes, no dependes de nadie.',
        { h: 'Desactivarlo para las próximas fotos' },
        { ul: ['iPhone: Ajustes › Privacidad y seguridad › Localización › Cámara › Nunca.', 'Android: abre la app de la cámara, entra en sus ajustes y desactiva la etiqueta de ubicación (el nombre cambia según el móvil).'] }
      ]
    },
    word: {
      slug: 'pdf-a-word-conservando-el-formato', title: 'Convertir un PDF a Word conservando el formato, gratis y privado · LunaVerta',
      desc: 'Convierte un PDF en un documento de Word editable que conserva fuentes, negritas, alineación e imágenes. Gratis, sin cuenta, y el PDF nunca sale de tu dispositivo.',
      h1: 'Convertir un PDF a Word conservando el formato', lead: 'Tienes que cambiar un documento que solo tienes en PDF. Así lo conviertes en un archivo de Word que puedes editar, con fuentes, negritas, alineación e imágenes.',
      body: [
        { h: 'Paso a paso' },
        { ol: ['Abre <a href="{tool}">PDF a Word</a> y elige el PDF.', 'Se lee el texto de cada página y se monta un archivo .docx con párrafos, fuentes, tamaños, negrita y cursiva, alineación e imágenes.', 'Haz clic en <b>Guardar</b>.', 'Ábrelo en Word, Pages, LibreOffice o Google Docs y edítalo.'] },
        { h: '¿Solo corregir unas palabras?' },
        'Quizá ni siquiera necesites Word. Con <a href="{t:edit-pdf}">Editar PDF</a> corriges el texto directamente en el PDF, con su propia fuente, y el resto de la página queda exactamente como estaba.',
        { h: 'PDF escaneados' },
        'Un escaneo es una imagen del papel, así que no hay texto que leer. Pásalo primero por <a href="{t:ocr}">OCR: hacer un PDF buscable</a> y luego convierte el resultado a Word.',
        { h: 'Lo que no se traslada' },
        'Los diseños complicados, como texto en muchas columnas, tablas dibujadas con líneas o texto sobre imágenes, pueden necesitar algún retoque en Word después.'
      ]
    }
  },
  // ---------------------------------------------------------------- French
  fr: {
    cpr: {
      slug: 'retirer-numero-securite-sociale-pdf', title: 'Retirer un numéro de sécurité sociale d\'un PDF · LunaVerta',
      desc: 'Comment retirer pour de bon un numéro de sécurité sociale, un numéro fiscal ou un autre identifiant d\'un PDF, pour qu\'il ne puisse être ni copié ni retrouvé. Gratuit, et le fichier ne quitte jamais votre appareil.',
      h1: 'Retirer un numéro de sécurité sociale d\'un PDF', lead: 'Un numéro de sécurité sociale ou un numéro fiscal sur un document que vous partagez peut être utilisé à mauvais escient. Voici comment le retirer correctement, pour qu\'il disparaisse vraiment du fichier au lieu d\'être seulement masqué.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Anonymiser PDF</a> et choisissez votre PDF.', 'LunaVerta parcourt chaque page et marque en jaune les numéros d\'identification, ainsi que d\'autres données qu\'on retire souvent, comme les IBAN, les adresses e-mail et les numéros de téléphone.', 'Pour ne retirer que le numéro d\'identification, désactivez les autres catégories. Touchez une marque pour garder précisément ce texte.', 'Cliquez sur <b>Supprimer … et enregistrer une nouvelle version</b>. Le texte marqué est effacé du fichier et une copie est enregistrée sur votre appareil. L\'original reste intact.'] },
        { h: 'Pourquoi un cadre noir dans Word ou le lecteur PDF ne suffit pas' },
        'Un rectangle noir sur un numéro ne fait généralement que le cacher. Le texte reste dessous, et n\'importe qui peut le copier ou le retrouver avec une recherche. LunaVerta efface les caractères eux-mêmes : il ne reste rien à copier.',
        { h: 'Vérifier le résultat' },
        'Ouvrez le PDF enregistré, appuyez sur Ctrl+F (ou Cmd+F sur Mac) et cherchez les premiers chiffres du numéro. Rien ne doit être trouvé.',
        { h: 'Documents scannés' },
        'Si le PDF est un scan (une image du papier), il n\'y a pas de texte à rechercher. Utilisez <b>Noircir</b> dans la même fenêtre et tracez vous-même un cadre sur le numéro ; il est incrusté dans l\'image à l\'enregistrement.'
      ]
    },
    payslip: {
      slug: 'partager-fiche-de-paie-en-securite', title: 'Partager sa fiche de paie en sécurité, sans numéro de sécurité sociale ni RIB · LunaVerta',
      desc: 'Le propriétaire, la banque ou un nouvel employeur veut voir votre fiche de paie ? Retirez d\'abord le numéro de sécurité sociale, l\'IBAN et les autres détails. Gratuit et privé.',
      h1: 'Partager sa fiche de paie en sécurité', lead: 'Propriétaires, banques et nouveaux employeurs demandent souvent une fiche de paie. Ils ont besoin de vos revenus, pas de votre numéro de sécurité sociale ni de votre compte bancaire. Voici comment n\'envoyer que ce dont ils ont besoin.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Anonymiser PDF</a> et choisissez la fiche de paie.', 'Le numéro de sécurité sociale, l\'IBAN, l\'e-mail et le numéro de téléphone sont trouvés et marqués en jaune.', 'Gardez ce que le destinataire doit voir. Si les montants du salaire sont marqués, désactivez la catégorie Prix pour qu\'ils restent.', 'Cliquez sur <b>Supprimer … et enregistrer une nouvelle version</b> et envoyez la copie enregistrée.'] },
        { h: 'Ce qu\'il faut retirer et ce qu\'il faut garder' },
        { ul: ['Retirer : le numéro de sécurité sociale, l\'IBAN, les détails du prélèvement à la source que personne n\'a demandés, et votre adresse si le destinataire l\'a déjà.', 'Garder : votre nom, l\'employeur, la période et les montants. C\'est généralement ce que le destinataire doit vérifier.'] },
        { h: 'Plusieurs mois ?' },
        'Si on vous demande trois mois, anonymisez chaque fiche puis réunissez-les avec <a href="{merge}">Fusionner PDF</a>, pour n\'envoyer qu\'un seul fichier.'
      ]
    },
    lease: {
      slug: 'signer-bail-sans-imprimante', title: 'Signer un bail sans imprimante · LunaVerta',
      desc: 'Signez un bail ou un autre contrat en PDF : dessinez votre signature, placez-la, ajoutez la date et renvoyez-le. Sans imprimante, sans scanner et sans envoi.',
      h1: 'Signer un bail sans imprimante', lead: 'On vous a envoyé un bail en PDF à signer. Pas besoin d\'imprimante ni de scanner : vous pouvez le signer en une minute sur ordinateur ou sur téléphone.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Signer PDF</a> et choisissez le contrat.', 'Dessinez votre signature à la souris ou au doigt. Cochez <b>Ajouter la date du jour sous la signature</b> si la date doit apparaître.', 'Cliquez sur <b>Placer sur la page</b>, puis là où la signature doit aller. Allez sur les autres pages et cliquez à nouveau si elles doivent aussi être signées ou paraphées.', 'Cliquez sur <b>Enregistrer le PDF</b> et renvoyez la copie signée.'] },
        { h: 'Une signature dessinée est-elle valable ?' },
        'Une signature dessinée sur un PDF est une signature électronique simple. Beaucoup de propriétaires et d\'entreprises l\'acceptent, mais certains contrats exigent une signature manuscrite ou une signature électronique qualifiée. En cas de doute, demandez à la personne qui vous a envoyé le contrat. Ceci n\'est pas un conseil juridique.',
        { h: 'Vous signez souvent ?' },
        'Cochez <b>Mémoriser sur cet appareil</b> : la signature est enregistrée sur votre propre appareil, prête pour la prochaine fois. Elle n\'est jamais envoyée nulle part.'
      ]
    },
    receipts: {
      slug: 'reunir-tickets-dans-un-pdf', title: 'Réunir des tickets dans un PDF pour l\'assurance, les notes de frais ou les impôts · LunaVerta',
      desc: 'Photographiez vos tickets et faites-en un PDF propre et consultable pour l\'assurance, la note de frais ou la déclaration d\'impôts. Gratuit et privé.',
      h1: 'Réunir des tickets dans un PDF', lead: 'Les déclarations de sinistre, les notes de frais et les impôts demandent souvent les justificatifs en un seul fichier. Voici comment passer d\'une pile de papiers à un PDF propre, avec seulement votre téléphone.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Scanner en PDF</a> sur votre téléphone et photographiez le premier ticket.', 'Les bords sont détectés et le ticket est redressé comme un vrai scan. Cliquez sur <b>Ajouter une page</b> et photographiez le suivant. Recommencez pour tous.', 'Cochez <b>Rendre le texte consultable (OCR)</b> pour pouvoir rechercher des montants plus tard.', 'Cliquez sur <b>Créer le PDF</b>, puis sur <b>Enregistrer</b>. Tous les tickets forment maintenant un seul fichier.'] },
        { h: 'Certains justificatifs sont déjà des PDF ?' },
        'Enregistrez votre scan, puis réunissez-le avec les autres PDF dans <a href="{merge}">Fusionner PDF</a>.',
        { h: 'Trop lourd pour un e-mail ?' },
        'Beaucoup de messageries s\'arrêtent à 20–25 Mo. <a href="{compress}">Compresser PDF</a> allège le fichier sans rendre les tickets difficiles à lire.'
      ]
    },
    heic: {
      slug: 'photos-iphone-heic-en-jpg', title: 'Convertir les photos d\'iPhone (HEIC) en JPG, gratuitement et sans envoi · LunaVerta',
      desc: 'Vos photos d\'iPhone sont des fichiers .HEIC que Windows et beaucoup de sites n\'ouvrent pas ? Transformez-les en photos JPG ordinaires en quelques secondes, sur votre propre appareil.',
      h1: 'Convertir les photos d\'iPhone (HEIC) en JPG', lead: 'L\'iPhone enregistre les photos en HEIC pour gagner de la place. Sur le téléphone, aucun souci, mais beaucoup de PC Windows, de sites et de formulaires les refusent. Voici comment en faire des photos JPG ordinaires.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">HEIC en JPG</a>.', 'Choisissez vos photos HEIC ou faites-les glisser sur la page. Vous pouvez en prendre beaucoup à la fois.', 'Elles sont converties en JPG immédiatement, sur votre appareil.', 'Cliquez sur <b>Enregistrer</b> pour chaque photo, ou enregistrez-les toutes à la fois dans un .zip.'] },
        { h: 'La qualité reste-t-elle la même ?' },
        'La photo a le même aspect. Les JPG sont un peu plus lourds que les HEIC : c\'est le prix pour qu\'ils s\'ouvrent partout. S\'ils doivent être plus légers, par exemple pour un formulaire avec une limite de taille, utilisez ensuite <a href="{t:compress-image}">Compresser une image</a>.',
        { h: 'Localisation et autres données cachées' },
        'Les photos de téléphone enregistrent souvent l\'endroit où elles ont été prises. Si vous les partagez avec des inconnus, passez-les aussi par <a href="{t:remove-photo-location}">Supprimer la localisation des photos</a>.',
        { h: 'Faire arrêter le HEIC à l\'iPhone' },
        'Sur l\'iPhone, allez dans Réglages › Appareil photo › Formats et choisissez <b>Le plus compatible</b>. Les nouvelles photos seront enregistrées en JPG. Les photos déjà prises restent en HEIC.'
      ]
    },
    email: {
      slug: 'pdf-assez-leger-pour-e-mail', title: 'Rendre un PDF assez léger pour un e-mail · LunaVerta',
      desc: 'PDF trop lourd pour une pièce jointe ? La plupart des messageries s\'arrêtent à 20–25 Mo. Voici comment l\'alléger, gratuitement et sans l\'envoyer nulle part.',
      h1: 'Rendre un PDF assez léger pour un e-mail', lead: 'Votre PDF est trop lourd pour être joint. La plupart des messageries s\'arrêtent entre 20 et 25 Mo, et certaines entreprises ont une limite encore plus basse. Voici comment le rendre assez léger.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Compresser PDF</a> et choisissez le PDF.', 'Chaque page est redessinée de façon plus compacte. Le texte peut toujours être recherché et copié.', 'Vous voyez de combien il a été allégé. Cliquez sur <b>Enregistrer</b>.', 'S\'il n\'a pas pu être allégé, vous récupérez votre original inchangé.'] },
        { h: 'Ce qui alourdit les PDF' },
        'Presque toujours les images : scans, photos et photos de papiers prises au téléphone. Un scan de 30 pages atteint vite 40 Mo ; après compression, il ne fait souvent plus que quelques Mo. Les PDF surtout composés de texte saisi sont généralement déjà légers, et la compression y change peu.',
        { h: 'Toujours trop lourd ?' },
        { ul: ['Découpez-le : <a href="{t:split-pdf}">Diviser PDF</a> crée un fichier par page, et avec <a href="{t:extract-pages}">Extraire des pages PDF</a> vous n\'envoyez que les pages utiles.', 'Envoyez-le en plusieurs fois, une pièce jointe par e-mail.'] },
        { h: 'Quand ne pas compresser' },
        'La compression transforme les pages en images qui conservent le texte ; les liens et les champs de formulaire remplissables sont perdus. Si le destinataire doit remplir ou signer le formulaire, envoyez l\'original.'
      ]
    },
    gps: {
      slug: 'retirer-localisation-photos-avant-partage', title: 'Retirer la localisation des photos avant de les partager ou de les vendre · LunaVerta',
      desc: 'Les photos de téléphone révèlent souvent où elles ont été prises, y compris chez vous. Retirez la position GPS et les autres données cachées avant de partager ou de vendre en ligne. Gratuit et privé.',
      h1: 'Retirer la localisation des photos avant de les partager', lead: 'La plupart des photos de téléphone enregistrent discrètement l\'endroit où elles ont été prises. La photo du canapé que vous vendez peut dire à un inconnu où vous habitez. Voici comment l\'effacer avant de partager.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">Supprimer la localisation des photos</a>.', 'Choisissez vos photos ou faites-les glisser sur la page.', 'La localisation, les données de l\'appareil, la date et les autres données cachées sont retirées. L\'image elle-même n\'est pas touchée : aucune perte de qualité.', 'Enregistrez les photos nettoyées et partagez-les à la place des originales.'] },
        { h: 'Le site ne le fait-il pas déjà ?' },
        'Certaines grandes plateformes retirent la localisation à l\'envoi, mais on ne le voit pas toujours, et les photos envoyées par e-mail, comme fichier dans une messagerie ou sur une clé USB la gardent généralement. En les nettoyant avant, vous ne dépendez de personne.',
        { h: 'Le désactiver pour les prochaines photos' },
        { ul: ['iPhone : Réglages › Confidentialité et sécurité › Service de localisation › Appareil photo › Jamais.', 'Android : ouvrez l\'appli appareil photo, allez dans ses réglages et désactivez la géolocalisation (le nom varie selon le téléphone).'] }
      ]
    },
    word: {
      slug: 'pdf-en-word-en-gardant-la-mise-en-page', title: 'Convertir un PDF en Word en gardant la mise en page, gratuit et privé · LunaVerta',
      desc: 'Transformez un PDF en document Word modifiable qui garde les polices, le gras, l\'alignement et les images. Gratuit, sans compte, et le PDF ne quitte jamais votre appareil.',
      h1: 'Convertir un PDF en Word en gardant la mise en page', lead: 'Vous devez modifier un document que vous n\'avez qu\'en PDF. Voici comment en faire un fichier Word modifiable, avec les polices, le gras, l\'alignement et les images.',
      body: [
        { h: 'Étape par étape' },
        { ol: ['Ouvrez <a href="{tool}">PDF en Word</a> et choisissez le PDF.', 'Le texte de chaque page est lu et assemblé en un fichier .docx, avec paragraphes, polices, tailles, gras et italique, alignement et images.', 'Cliquez sur <b>Enregistrer</b>.', 'Ouvrez-le dans Word, Pages, LibreOffice ou Google Docs et modifiez-le.'] },
        { h: 'Juste corriger quelques mots ?' },
        'Vous n\'avez peut-être même pas besoin de Word. Avec <a href="{t:edit-pdf}">Modifier PDF</a>, vous corrigez le texte directement dans le PDF, dans sa propre police, et le reste de la page reste exactement tel quel.',
        { h: 'PDF scannés' },
        'Un scan est une image du papier : il n\'y a pas de texte à lire. Passez-le d\'abord par <a href="{t:ocr}">OCR : rendre un PDF consultable</a>, puis convertissez le résultat en Word.',
        { h: 'Ce qui ne suit pas' },
        'Les mises en page compliquées, comme du texte sur plusieurs colonnes, des tableaux dessinés avec des traits ou du texte sur des images, peuvent demander quelques retouches dans Word ensuite.'
      ]
    }
  }
};
