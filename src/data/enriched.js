/**
 * enriched.js — Enriched data structures for richer AI suggestions.
 *
 * Imports the four base data files and programmatically generates:
 *   FAMILY_PROFILES   — one entry per fc (307 families)
 *   PROMO_HISTORY     — one entry per promoCode (9 promos)
 *   REPARTO_BENCHMARKS — one entry per reparto code (19 reparti)
 *
 * All values are derived deterministically from the family names, reparto names
 * and numeric codes so the output is stable across runs (no random seeds needed).
 */

import ANAGRAFICA from './anagrafica.js';
import PROMOZIONI from './promozioni.js';
import REPARTI from './reparti.js';

// ---------------------------------------------------------------------------
// Tiny deterministic hash — converts a string to a stable 0–1 float.
// Used everywhere we need "fake randomness" seeded by an fc/code string.
// ---------------------------------------------------------------------------
function hashFloat(str, salt = '') {
  const s = str + salt;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function hashInt(str, salt, min, max) {
  return min + Math.floor(hashFloat(str, salt) * (max - min + 1));
}

function hashPick(str, salt, arr) {
  return arr[Math.floor(hashFloat(str, salt) * arr.length)];
}

// ---------------------------------------------------------------------------
// Keyword-matching helpers — operate on upper-cased family name (fn)
// ---------------------------------------------------------------------------
function contains(fn, ...keywords) {
  const u = fn.toUpperCase();
  return keywords.some(k => u.includes(k.toUpperCase()));
}

// ---------------------------------------------------------------------------
// FAMILY_PROFILES rules — maps keyword patterns to attribute overrides.
// Rules are checked in order; first match wins for each attribute.
// An "fc-seeded" fallback is used for families that match no specific rule.
// ---------------------------------------------------------------------------

const RULES = [
  // Birra / Beer
  {
    match: fn => contains(fn, 'BIRR'),
    peakMonths: [5, 6, 7, 8],
    promoElasticity: 0.72,
    targetDemo: 'Giovani adulti 25-45',
    priceSegment: 'mainstream',
    avgPrice: 5.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Famiglia di birre, un classico della convivialità italiana. Acquistata principalmente da giovani adulti per aperitivi, cene con amici e occasioni estive.`,
  },
  // Gelati / Ice cream
  {
    match: fn => contains(fn, 'GELAT'),
    peakMonths: [5, 6, 7, 8],
    promoElasticity: 0.80,
    targetDemo: 'Famiglie con bambini',
    priceSegment: 'mainstream',
    avgPrice: 4.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Gelati confezionati, prodotto altamente stagionale con picco in estate. Forte attrazione per famiglie con bambini e consumo impulsivo.`,
  },
  // Pasta (semola, fresca, integrale, ripiena…)
  {
    match: fn => contains(fn, 'PASTA'),
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    promoElasticity: 0.30,
    targetDemo: 'Tutti',
    priceSegment: 'entry',
    avgPrice: 1.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Pasta alimentare, prodotto di primo prezzo e altissima frequenza d'acquisto. Bene di prima necessità acquistato da ogni fascia demografica.`,
  },
  // Tonno / conserve di pesce
  {
    match: fn => contains(fn, 'TONNO', 'ALICI', 'ACCIUGH', 'SGOMBRO', 'CONSERVE PESCE'),
    peakMonths: [1, 2, 3, 4, 7, 8, 9],
    promoElasticity: 0.55,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'mainstream',
    avgPrice: 3.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Conserve ittiche in latta o vetro. Alimento proteico economico molto usato nella cucina italiana quotidiana, con buona risposta alle promozioni.`,
  },
  // Caffè
  {
    match: fn => contains(fn, 'CAFFE'),
    peakMonths: [1, 2, 3, 10, 11, 12],
    promoElasticity: 0.45,
    targetDemo: 'Adulti 25-65',
    priceSegment: 'mainstream',
    avgPrice: 4.8,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Caffè macinato, in grani o capsule. Prodotto ad alta fedeltà di marca; le promozioni attirano consumatori alla scoperta di nuovi formati o blend premium.`,
  },
  // Latte UHT e sostitutivi
  {
    match: fn => contains(fn, 'LATTE', 'SOSTITUTIVI DEL LATTE'),
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    promoElasticity: 0.25,
    targetDemo: 'Famiglie',
    priceSegment: 'entry',
    avgPrice: 1.3,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Latte UHT, prodotto a consumo quotidiano con acquisto pianificato. Elevata penetrazione delle marche private; bassa elasticità promozionale.`,
  },
  // Acqua
  {
    match: fn => contains(fn, 'ACQUA'),
    peakMonths: [5, 6, 7, 8, 9],
    promoElasticity: 0.60,
    targetDemo: 'Tutti',
    priceSegment: 'entry',
    avgPrice: 0.55,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Acqua minerale in bottiglia, prodotto di prima necessità con picco estivo. Molto sensibile alla promozione per via dei grandi formati da scorta.`,
  },
  // Olio d'oliva / semi
  {
    match: fn => contains(fn, 'OLIO'),
    peakMonths: [9, 10, 11, 12, 1],
    promoElasticity: 0.50,
    targetDemo: 'Adulti 35-65',
    priceSegment: 'mainstream',
    avgPrice: 6.5,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Olio di oliva o di semi, condimento fondamentale della dieta mediterranea. Forte sensibilità al prezzo dopo i rincari delle materie prime degli ultimi anni.`,
  },
  // Vino
  {
    match: fn => contains(fn, 'VINO', 'DOC', 'DOCG'),
    peakMonths: [11, 12, 1, 4, 5],
    promoElasticity: 0.62,
    targetDemo: 'Adulti 35-65',
    priceSegment: 'mainstream',
    avgPrice: 6.8,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Vino DOC/DOCG italiano, con picchi di vendita durante le festività e i pranzi del fine settimana. Target di consumatori attenti alla qualità e all'origine.`,
  },
  // Spumante / prosecco
  {
    match: fn => contains(fn, 'SPUMANT', 'CHARMAT', 'PROSECCO', 'CHAMPAGNE'),
    peakMonths: [11, 12, 1],
    promoElasticity: 0.70,
    targetDemo: 'Adulti 30-55',
    priceSegment: 'premium',
    avgPrice: 9.5,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'low',
    description: (fn) =>
      `Vini spumanti e prosecco, protagonisti delle tavole delle feste. Forte stagionalità in dicembre e nei periodi di festività primaverili.`,
  },
  // Biscotti / merendine / snack dolci
  {
    match: fn => contains(fn, 'BISCOTT', 'MERENDIN', 'FROLLINI', 'WAFER', 'SNACK DOLCI'),
    peakMonths: [9, 10, 11, 12, 1, 2],
    promoElasticity: 0.65,
    targetDemo: 'Famiglie con bambini',
    priceSegment: 'mainstream',
    avgPrice: 2.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Prodotti dolci da forno per colazione e merenda. Target principale le famiglie con bambini; buona risposta alle promozioni multi-pack e in-pack.`,
  },
  // Yogurt
  {
    match: fn => contains(fn, 'YOGURT'),
    peakMonths: [3, 4, 5, 6, 7, 8],
    promoElasticity: 0.58,
    targetDemo: 'Adulti 20-50 salutisti',
    priceSegment: 'mainstream',
    avgPrice: 1.8,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Yogurt e similari, categoria fresca in crescita sul segmento funzionale e greco. Consumo quotidiano con forte fedeltà alla marca.`,
  },
  // Formaggi
  {
    match: fn => contains(fn, 'MOZZAR', 'GRANA', 'FORMAG', 'GORGONZ', 'CRESCENZ', 'ROBIOLA', 'FONTINA'),
    peakMonths: [4, 5, 6, 7, 8, 9, 12],
    promoElasticity: 0.50,
    targetDemo: 'Famiglie',
    priceSegment: 'mainstream',
    avgPrice: 3.9,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'medium',
    description: (fn) =>
      `Formaggi freschi e stagionati, categoria ad alta frequenza d'acquisto e ampia varietà. La mozzarella picca in estate, i formaggi stagionati nelle festività.`,
  },
  // Salumi / affettati
  {
    match: fn => contains(fn, 'PROSCIUT', 'SALUM', 'AFFETT', 'BRESAOL', 'SALAME'),
    peakMonths: [4, 5, 6, 7, 12],
    promoElasticity: 0.55,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'mainstream',
    avgPrice: 4.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'medium',
    description: (fn) =>
      `Salumi e affettati, tra le categorie più apprezzate della gastronomia italiana. Alta fedeltà alla marca ma sensibilità al prezzo nelle promozioni.`,
  },
  // Surgelati — pizza
  {
    match: fn => contains(fn, 'PIZZ', 'SURG PIZZ'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.68,
    targetDemo: 'Giovani adulti e famiglie',
    priceSegment: 'entry',
    avgPrice: 3.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Pizza surgelata, il surgelato più consumato in Italia. Ottima risposta promozionale, con consumo concentrato nei mesi autunnali e invernali.`,
  },
  // Surgelati generici
  {
    match: fn => contains(fn, 'SURG'),
    peakMonths: [10, 11, 12, 1, 2, 3],
    promoElasticity: 0.55,
    targetDemo: 'Famiglie',
    priceSegment: 'mainstream',
    avgPrice: 4.0,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Prodotti surgelati, categoria comoda e versatile. Ottima penetrazione nelle famiglie con bambini; il freddo invernale ne stimola i consumi.`,
  },
  // Detergenti / cura casa
  {
    match: fn => contains(fn, 'BUCATO', 'LAVASTOVIGLIE', 'AMMORBID', 'DETERG'),
    peakMonths: [1, 2, 3, 9, 10],
    promoElasticity: 0.60,
    targetDemo: 'Adulti 30-55',
    priceSegment: 'mainstream',
    avgPrice: 5.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Detergenti per la casa, categoria a bassa frequenza d'acquisto ma elevata fedeltà alla marca. Le promozioni a volume e multi-pack sono le più efficaci.`,
  },
  // Carta / usa e getta
  {
    match: fn => contains(fn, 'CARTA', 'ASCIUGAMAN', 'ROTOLI', 'FAZZOL', 'TOILET'),
    peakMonths: [1, 2, 3, 9, 10, 11, 12],
    promoElasticity: 0.55,
    targetDemo: 'Tutti',
    priceSegment: 'entry',
    avgPrice: 4.0,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Prodotti in carta usa e getta. Elevata sensibilità al prezzo e forte acquisto di scorta durante le promozioni a volume.`,
  },
  // Cura persona / igiene
  {
    match: fn =>
      contains(fn, 'SHAMPO', 'DENTIFRICIO', 'DOCCIA', 'DEODORANTE', 'CURA PERSONA', 'IGIENE'),
    peakMonths: [6, 7, 8, 1, 9],
    promoElasticity: 0.50,
    targetDemo: 'Adulti 20-55',
    priceSegment: 'mainstream',
    avgPrice: 4.8,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Prodotti per l'igiene e la cura della persona. Alta fedeltà alla marca; le promozioni attirano il cambio di formato o il cross-selling di linea.`,
  },
  // Pet Care
  {
    match: fn => contains(fn, 'CANE', 'GATTO', 'PET', 'ANIMALI'),
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    promoElasticity: 0.35,
    targetDemo: 'Proprietari di animali 25-60',
    priceSegment: 'mainstream',
    avgPrice: 5.5,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'low',
    description: (fn) =>
      `Alimenti e accessori per animali domestici. Acquisto pianificato e alta fedeltà; il segmento premium è in forte crescita.`,
  },
  // Ortofrutta
  {
    match: fn =>
      contains(fn, 'FRUTTA', 'VERDURA', 'ORTOFRUT', 'INSALAT', 'PATATE', 'POMODORI FRESCHI'),
    peakMonths: [5, 6, 7, 8, 9],
    promoElasticity: 0.65,
    targetDemo: 'Adulti 30-65',
    priceSegment: 'entry',
    avgPrice: 1.8,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'high',
    description: (fn) =>
      `Prodotti ortofrutticoli, categoria fresca ad alta frequenza d'acquisto e forte stagionalità. Impatto immediato delle promozioni sul traffico del punto vendita.`,
  },
  // Derivati pomodoro (passata, polpa)
  {
    match: fn => contains(fn, 'POMODORO', 'PASSATA', 'POLPA'),
    peakMonths: [7, 8, 9, 10, 1, 2],
    promoElasticity: 0.45,
    targetDemo: 'Adulti 30-65',
    priceSegment: 'entry',
    avgPrice: 1.2,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Derivati del pomodoro (passate, polpe, pelati), base fondamentale della cucina italiana. Acquistati per scorta durante le promozioni stagionali autunnali.`,
  },
  // Sughi pronti
  {
    match: fn => contains(fn, 'SUGO', 'SUGHI', 'PESTO', 'CONDIMENT'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.58,
    targetDemo: 'Adulti 25-55',
    priceSegment: 'mainstream',
    avgPrice: 2.8,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'low',
    description: (fn) =>
      `Sughi pronti e condimenti per pasta, categoria in crescita trainata dalla comodità. Forte innovazione di gusti e formato che stimola le vendite promozionali.`,
  },
  // Aperitivi / cocktail
  {
    match: fn => contains(fn, 'APERIT', 'COCKTAIL', 'COCKT'),
    peakMonths: [5, 6, 7, 8, 12],
    promoElasticity: 0.70,
    targetDemo: 'Giovani adulti 22-45',
    priceSegment: 'mainstream',
    avgPrice: 5.5,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'low',
    description: (fn) =>
      `Aperitivi alcolici e analcolici, categoria in forte crescita sulla scia della cultura dell'aperitivo. Picco estivo e fine d'anno.`,
  },
  // Bevande gassate / cola / energy drink
  {
    match: fn => contains(fn, 'COLA', 'ENERGY DRINK', 'BEVANDE GASSATE', 'GASSATA'),
    peakMonths: [5, 6, 7, 8],
    promoElasticity: 0.65,
    targetDemo: 'Giovani 15-35',
    priceSegment: 'mainstream',
    avgPrice: 1.8,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Bevande gassate e energy drink, con forte consumo giovanile. Alta elasticità promozionale soprattutto sui formati da 1,5 L e multipack.`,
  },
  // Succhi / bevande base frutta
  {
    match: fn => contains(fn, 'SUCCH', 'NETTARE', 'BASE FRUTTA', 'SUCCO'),
    peakMonths: [5, 6, 7, 8],
    promoElasticity: 0.58,
    targetDemo: 'Famiglie con bambini',
    priceSegment: 'mainstream',
    avgPrice: 2.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Succhi di frutta e bevande a base frutta, acquistati soprattutto per i bambini. Consumo estivo in crescita; buona risposta al multipack promozionale.`,
  },
  // Pane fresco / pasticceria fresca
  {
    match: fn => contains(fn, 'PANE FRESCO', 'PASTICCERIA FRESCA', 'PASTICCERIA SECCA'),
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    promoElasticity: 0.30,
    targetDemo: 'Tutti',
    priceSegment: 'mainstream',
    avgPrice: 2.0,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'medium',
    description: (fn) =>
      `Prodotti da forno freschi, acquistati quotidianamente. Bassa elasticità promozionale ma funzione di traffico fondamentale per il punto vendita.`,
  },
  // Integratori / salutistici / dietetici
  {
    match: fn => contains(fn, 'INTEGRAT', 'DIETET', 'SALUTIST', 'BIO', 'VITAMI'),
    peakMonths: [1, 2, 3, 9, 10],
    promoElasticity: 0.40,
    targetDemo: 'Adulti 35-65 attenti alla salute',
    priceSegment: 'premium',
    avgPrice: 12.0,
    supplierTier: 'follower',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Integratori alimentari e prodotti salutistici, segmento premium in crescita. Acquisto pianificato a inizio anno e a settembre; sensibilità moderata alle promo.`,
  },
  // Liquori
  {
    match: fn => contains(fn, 'LIQUORI', 'GIN', 'AMARI', 'WHISKY', 'VODKA', 'RUM'),
    peakMonths: [11, 12, 1],
    promoElasticity: 0.65,
    targetDemo: 'Adulti 30-65',
    priceSegment: 'premium',
    avgPrice: 14.0,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'low',
    description: (fn) =>
      `Spirits e liquori, con forte stagionalità nelle festività natalizie. Le promozioni di fine anno sono leve chiave per la categoria.`,
  },
  // Riso / cereali
  {
    match: fn => contains(fn, 'RISO', 'CEREALI', 'FARRO', 'ORZO', 'AVENA'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.38,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'entry',
    avgPrice: 1.8,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Riso e cereali secchi, prodotti di base ad acquisto pianificato. La promozione spinge la scorta e premia le confezioni da grande formato.`,
  },
  // Uova
  {
    match: fn => contains(fn, 'UOVA', 'UOVO'),
    peakMonths: [3, 4, 9, 10, 12],
    promoElasticity: 0.38,
    targetDemo: 'Famiglie',
    priceSegment: 'entry',
    avgPrice: 2.5,
    supplierTier: 'follower',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Uova fresche di gallina, tra i prodotti più acquistati del reparto fresco. Picchi a Pasqua e nel periodo natalizio; forte sensibilità al benessere animale.`,
  },
  // Zucchero / farina / ingredienti
  {
    match: fn => contains(fn, 'ZUCCHERO', 'FARINA', 'INGREDIENTI', 'LIEVIT'),
    peakMonths: [10, 11, 12, 1, 2, 3],
    promoElasticity: 0.30,
    targetDemo: 'Adulti 35-65',
    priceSegment: 'entry',
    avgPrice: 1.5,
    supplierTier: 'follower',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Ingredienti di base per la pasticceria casalinga. Acquistati in particolare nel periodo delle feste; bassa elasticità promozionale per l'uso professionale.`,
  },
  // Patatine / snack salati / estrusi
  {
    match: fn => contains(fn, 'PATATINE', 'SNACK SALAT', 'ESTRUSI', 'POPCORN'),
    peakMonths: [5, 6, 7, 8, 12],
    promoElasticity: 0.72,
    targetDemo: 'Giovani 15-35',
    priceSegment: 'mainstream',
    avgPrice: 2.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Snack salati e patatine, prodotto da impulso con picco estivo e natalizio. Alta promoelasticità; il multipack è il formato promozionale più efficace.`,
  },
  // Cioccolato / tavolette / barrette
  {
    match: fn => contains(fn, 'CIOCCOLAT', 'TAVOLETTE', 'BARRETTE', 'CACAO'),
    peakMonths: [10, 11, 12, 1, 2, 3, 4],
    promoElasticity: 0.68,
    targetDemo: 'Tutti',
    priceSegment: 'mainstream',
    avgPrice: 3.2,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Cioccolato in tavolette e barrette, con forte stagionalità invernale e a Pasqua. Alta impulsività d'acquisto; la promozione di prezzo è molto efficace.`,
  },
  // Confetture / marmellate
  {
    match: fn => contains(fn, 'CONFETTUR', 'MARMELLAT', 'SPALMABILI FRUTTA'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.48,
    targetDemo: 'Famiglie con bambini e over 40',
    priceSegment: 'mainstream',
    avgPrice: 2.8,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Confetture e marmellate, accompagnamento classico per colazione. Acquisto pianificato con buona risposta alle promozioni 2x1 e formato risparmio.`,
  },
  // Creme spalmabili dolci (Nutella etc.)
  {
    match: fn => contains(fn, 'CREME SPALMABILI', 'SPALMABILI DOLCI', 'NOCCIOLA'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.60,
    targetDemo: 'Famiglie con bambini',
    priceSegment: 'mainstream',
    avgPrice: 3.8,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Creme spalmabili dolci alla nocciola, categoria dominata da brand forti. Alta fedeltà al marchio ma ottima risposta alla promozione di prezzo.`,
  },
  // Grana / parmigiano grattugiato
  {
    match: fn => contains(fn, 'GRATTUGI'),
    peakMonths: [9, 10, 11, 12, 1, 2, 3],
    promoElasticity: 0.42,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'mainstream',
    avgPrice: 4.5,
    supplierTier: 'leader',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Formaggio grattugiato, ingrediente indispensabile della cucina italiana. Acquisto pianificato; la promozione è utile per la migrazione di formato.`,
  },
  // The / infusi
  {
    match: fn => contains(fn, 'TEA', 'THE', 'INFUSI', 'CAMOMILLA', 'TISANA'),
    peakMonths: [10, 11, 12, 1, 2, 3],
    promoElasticity: 0.40,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'mainstream',
    avgPrice: 3.0,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Tè e infusi, prodotti a consumo soprattutto invernale e mattutino. Categoria in crescita grazie ai formati funzionali e all'interesse per il benessere.`,
  },
  // Salmone e specialità ittiche
  {
    match: fn => contains(fn, 'SALMONE', 'ITTICH'),
    peakMonths: [11, 12, 3, 4],
    promoElasticity: 0.70,
    targetDemo: 'Adulti 30-55',
    priceSegment: 'premium',
    avgPrice: 8.5,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'medium',
    description: (fn) =>
      `Specialità ittiche affumicate come il salmone, prodotto festivo per eccellenza. Forte picco natalizio; la promozione è molto efficace per allargare il target.`,
  },
  // Piatti pronti
  {
    match: fn => contains(fn, 'PIATT', 'PRONTI', 'PREPARATI'),
    peakMonths: [9, 10, 11, 12, 1, 2],
    promoElasticity: 0.62,
    targetDemo: 'Single e giovani adulti 22-45',
    priceSegment: 'mainstream',
    avgPrice: 4.5,
    supplierTier: 'follower',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Piatti pronti e preparati, categoria in forte crescita per la semplificazione dei pasti. Target principale single e famiglie con poco tempo.`,
  },
  // Olive / vegetali conservati
  {
    match: fn => contains(fn, 'OLIVE', 'VEGETALI', 'LEGUMI', 'CARCIOFI', 'FUNGHI'),
    peakMonths: [8, 9, 10, 12],
    promoElasticity: 0.45,
    targetDemo: 'Adulti 35-65',
    priceSegment: 'mainstream',
    avgPrice: 2.5,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Vegetali e legumi in conserva, prodotti da dispensa versatili. L'autunno è il momento chiave con la stagione della preservazione domestica.`,
  },
  // Crackers / grissini / fette biscottate
  {
    match: fn => contains(fn, 'CRACKERS', 'GRISSINI', 'FETTE BISCOTTATE', 'PANETTI'),
    peakMonths: [6, 7, 8, 12],
    promoElasticity: 0.50,
    targetDemo: 'Tutti',
    priceSegment: 'mainstream',
    avgPrice: 2.0,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Prodotti sostitutivi del pane come crackers, grissini e fette biscottate. Consumo tutto l'anno con picco estivo per accompagnare aperitivi e pic-nic.`,
  },
  // Panna da cucina
  {
    match: fn => contains(fn, 'PANNA'),
    peakMonths: [11, 12, 1, 4],
    promoElasticity: 0.42,
    targetDemo: 'Adulti 30-60',
    priceSegment: 'entry',
    avgPrice: 1.8,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Panna da cucina UHT, ingrediente versatile per primi e secondi. Picco nelle festività per i pranzi importanti; acquisto pianificato.`,
  },
  // Burro
  {
    match: fn => contains(fn, 'BURRO'),
    peakMonths: [10, 11, 12, 1, 4],
    promoElasticity: 0.35,
    targetDemo: 'Adulti 30-65',
    priceSegment: 'entry',
    avgPrice: 2.8,
    supplierTier: 'follower',
    marginTrend: 'up',
    stockRisk: 'medium',
    description: (fn) =>
      `Burro, ingrediente base della pasticceria italiana. Forte picco natalizio e pasquale; sensibilità al prezzo crescente dopo i rincari delle materie prime.`,
  },
  // Carne in scatola
  {
    match: fn => contains(fn, 'CARNE IN SCATOLA', 'CARNE SCATOLA'),
    peakMonths: [7, 8],
    promoElasticity: 0.50,
    targetDemo: 'Adulti 40-70',
    priceSegment: 'entry',
    avgPrice: 2.5,
    supplierTier: 'follower',
    marginTrend: 'down',
    stockRisk: 'low',
    description: (fn) =>
      `Carne in scatola, prodotto storico in leggero declino per le nuove abitudini alimentari. Mantiene fedele il target più anziano.`,
  },
  // Maionese / ketchup / salse
  {
    match: fn => contains(fn, 'MAIONES', 'KETCHUP', 'SALSE'),
    peakMonths: [5, 6, 7, 8],
    promoElasticity: 0.58,
    targetDemo: 'Famiglie',
    priceSegment: 'mainstream',
    avgPrice: 2.5,
    supplierTier: 'leader',
    marginTrend: 'stable',
    stockRisk: 'low',
    description: (fn) =>
      `Condimenti freddi come maionese e ketchup, con picco estivo legato a grigliate e pic-nic. Alta impulsività d'acquisto durante le promozioni.`,
  },
  // Bazar / tessile / non food
  {
    match: fn =>
      contains(fn, 'TESSILE', 'BAZAR', 'CASALINGH', 'CUCINA', 'ABBIGLIAMENT'),
    peakMonths: [3, 4, 9, 10],
    promoElasticity: 0.75,
    targetDemo: 'Adulti 25-55',
    priceSegment: 'mainstream',
    avgPrice: 12.0,
    supplierTier: 'follower',
    marginTrend: 'stable',
    stockRisk: 'medium',
    description: (fn) =>
      `Prodotti non alimentari di bazar o tessile; acquisto d'impulso stimolato dai temi stagionali e dalle promozioni tematiche.`,
  },
];

// ---------------------------------------------------------------------------
// Cross-sell pairing database: maps group code prefix → plausible cross-sell fcs.
// We seed this so each family consistently gets 2-3 plausible partners from the
// same ANAGRAFICA pool.
// ---------------------------------------------------------------------------
const ALL_FC_BY_GC = {};
for (const item of ANAGRAFICA) {
  const gc = item.gc;
  if (!ALL_FC_BY_GC[gc]) ALL_FC_BY_GC[gc] = [];
  ALL_FC_BY_GC[gc].push(item.fc);
}

// reparto → array of gc codes in that reparto
const GC_BY_REPARTO = {};
for (const item of ANAGRAFICA) {
  const rc = item.rc;
  if (!GC_BY_REPARTO[rc]) GC_BY_REPARTO[rc] = new Set();
  GC_BY_REPARTO[rc].add(item.gc);
}

// All fcs in a given reparto
const FC_BY_REPARTO = {};
for (const item of ANAGRAFICA) {
  if (!FC_BY_REPARTO[item.rc]) FC_BY_REPARTO[item.rc] = [];
  FC_BY_REPARTO[item.rc].push(item.fc);
}

// Known affinity pairs (gc→ array of gc codes that complement it well)
const GC_AFFINITIES = {
  '0106': ['0109', '0115', '0121'],   // conserve animali → sughi, pasta, pomodoro
  '0115': ['0121', '0109', '0106'],   // pasta → pomodoro, sughi, conserve
  '0121': ['0115', '0109', '0106'],   // pomodoro → pasta, sughi, conserve
  '0109': ['0115', '0121', '0106'],   // sughi → pasta, pomodoro, conserve
  '0114': ['0101', '0119', '0118'],   // caffè → biscotti, marmellate, latte
  '0101': ['0114', '0119', '0118'],   // biscotti → caffè, marmellate, latte
  '0119': ['0101', '0114', '0118'],   // spalmabili → biscotti, caffè, latte
  '0118': ['0101', '0114', '0119'],   // latte → biscotti, caffè, spalmabili
  '0103': ['0207', '0205', '0210'],   // snack salati → cola, aperitivi, birra
  '0207': ['0103', '0205', '0210'],   // bevande gassate → snack, aperitivi, birra
  '0205': ['0103', '0210', '0207'],   // aperitivi → snack, birra, cola
  '0210': ['0205', '0103', '0207'],   // birra → aperitivi, snack, cola
  '0203': ['0205', '0301', '0306'],   // vino → aperitivi, formaggi, salumi
  '0202': ['0203', '0205', '0301'],   // spumante → vino, aperitivi, formaggi
  '0204': ['0205', '0103', '0203'],   // liquori → aperitivi, snack, vino
  '0301': ['0306', '0203', '0310'],   // formaggi → salumi, vino, pasta fresca
  '0306': ['0301', '0203', '0310'],   // salumi → formaggi, vino, pasta fresca
  '0310': ['0301', '0306', '0309'],   // pasta fresca → formaggi, salumi, piatti pronti
  '0302': ['0101', '0114', '0118'],   // yogurt → biscotti, caffè, latte
  '0401': ['0402', '0103', '0101'],   // gelati → surgelati, snack, biscotti
  '0402': ['0401', '0115', '0109'],   // surgelati → gelati, pasta, sughi
  '0105': ['0115', '0121', '0109'],   // olio → pasta, pomodoro, sughi
  '0508': ['0509', '0504', '0503'],   // bucato → ammorbidenti, carta, lavastoviglie
  '0509': ['0508', '0504', '0503'],   // ammorbidenti → bucato, carta, lavastov.
  '0503': ['0508', '0504', '0509'],   // lavastov. → bucato, carta, ammorbidenti
  '0311': ['0101', '0301', '0306'],   // uova → biscotti, formaggi, salumi
};

function getCrossSellFamilies(item) {
  const gc = item.gc;
  const affinities = GC_AFFINITIES[gc] || null;
  const candidates = [];

  if (affinities) {
    for (const affGc of affinities) {
      const pool = ALL_FC_BY_GC[affGc] || [];
      if (pool.length > 0) {
        // pick a stable candidate from this affinity group (not the same fc)
        const saltedPool = pool.filter(f => f !== item.fc);
        if (saltedPool.length > 0) {
          candidates.push(hashPick(item.fc, affGc, saltedPool));
        }
      }
      if (candidates.length >= 3) break;
    }
  }

  // fallback: pick from same reparto
  if (candidates.length < 2) {
    const repartoPool = (FC_BY_REPARTO[item.rc] || []).filter(
      f => f !== item.fc && !candidates.includes(f)
    );
    let i = 0;
    while (candidates.length < 3 && i < 5) {
      const f = hashPick(item.fc, `fallback${i}`, repartoPool);
      if (f && !candidates.includes(f)) candidates.push(f);
      i++;
    }
  }

  return candidates.slice(0, 3);
}

// ---------------------------------------------------------------------------
// FAMILY_PROFILES builder
// ---------------------------------------------------------------------------
const DEMO_OPTIONS = [
  'Famiglie', 'Famiglie con bambini', 'Giovani adulti 25-45', 'Adulti 30-60',
  'Adulti 35-65', 'Over 55', 'Single', 'Tutti',
];

const MARGIN_TRENDS = ['up', 'stable', 'down'];
const PRICE_SEGS = ['entry', 'mainstream', 'premium'];
const SUPPLIER_TIERS = ['leader', 'follower', 'private-label'];
const STOCK_RISKS = ['low', 'medium', 'high'];

function buildFamilyProfile(item) {
  const fn = item.fn;
  const fc = item.fc;

  // Find first matching rule
  const rule = RULES.find(r => r.match(fn));

  // --- Deterministic fallback values seeded by fc ---
  const fallbackPriceSegment = hashPick(fc, 'pseg', PRICE_SEGS);
  const fallbackAvgPrice =
    fallbackPriceSegment === 'entry'
      ? +(1.0 + hashFloat(fc, 'ap') * 2.0).toFixed(2)
      : fallbackPriceSegment === 'premium'
      ? +(8.0 + hashFloat(fc, 'ap') * 12.0).toFixed(2)
      : +(2.5 + hashFloat(fc, 'ap') * 4.5).toFixed(2);
  const fallbackElasticity = +(0.35 + hashFloat(fc, 'el') * 0.45).toFixed(2);
  const fallbackTargetDemo = hashPick(fc, 'td', DEMO_OPTIONS);
  const fallbackSupplierTier = hashPick(fc, 'st', SUPPLIER_TIERS);
  const fallbackMarginTrend = hashPick(fc, 'mt', MARGIN_TRENDS);
  const fallbackStockRisk = hashPick(fc, 'sr', STOCK_RISKS);

  // Peak months: generate 2-6 months seeded by fc if no rule
  const nPeak = hashInt(fc, 'npm', 2, 5);
  const shuffled = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(m => [hashFloat(fc, `pm${m}`), m])
    .sort((a, b) => a[0] - b[0])
    .map(([, m]) => m);
  const fallbackPeakMonths = shuffled.slice(0, nPeak).sort((a, b) => a - b);

  const priceSegment = rule ? rule.priceSegment : fallbackPriceSegment;
  const avgPrice = rule ? rule.avgPrice : fallbackAvgPrice;

  const description = rule
    ? rule.description(fn)
    : `Prodotto alimentare della famiglia ${item.sn}, collocato nel reparto ${item.rn}. Acquistato regolarmente da ${fallbackTargetDemo.toLowerCase()} nei principali punti vendita.`;

  return {
    fc,
    fn,
    rc: item.rc,
    rn: item.rn,
    description,
    avgPrice,
    priceSegment,
    targetDemo: rule ? rule.targetDemo : fallbackTargetDemo,
    peakMonths: rule ? rule.peakMonths : fallbackPeakMonths,
    supplierTier: rule ? rule.supplierTier : fallbackSupplierTier,
    crossSellFamilies: getCrossSellFamilies(item),
    promoElasticity: rule ? rule.promoElasticity : fallbackElasticity,
    marginTrend: rule ? rule.marginTrend : fallbackMarginTrend,
    stockRisk: rule ? rule.stockRisk : fallbackStockRisk,
  };
}

export const FAMILY_PROFILES = {};
for (const item of ANAGRAFICA) {
  FAMILY_PROFILES[item.fc] = buildFamilyProfile(item);
}

// ---------------------------------------------------------------------------
// PROMO_HISTORY builder
// ---------------------------------------------------------------------------

const COMPETITOR_TEXTS = {
  Q1: 'I principali competitor stanno spingendo offerte di inizio anno con focus su prodotti salutistici e scorte invernali. Discount tedeschi aumentano la pressione promozionale sulla drogheria.',
  Q2: 'La concorrenza punta su promozioni estive anticipate e grandi formati. I supermercati online incrementano le offerte su bevande e prodotti per l\'estate.',
  Q3: 'Il mercato del back-to-school è conteso da diversi operatori. I competitor intensificano le promo su prodotti per la colazione e la merenda scolastica.',
};

const SEASONAL_TEXTS = {
  '2026-01': 'Febbraio: mese post-natalizio con consumatori attenti al budget. Clima freddo favorisce prodotti per la colazione e le scorte da dispensa.',
  '2026-02': 'Maggio: avvio della stagione primaverile ed estiva. Crescono gli acquisti di bevande, prodotti per l\'aperitivo e alimenti freschi.',
  '2026-03': 'Ottobre: rientro dalle vacanze e ripresa dei consumi familiari. Ripartono la scuola e le routine domestiche; crescono drogheria e cura casa.',
  '2026-11': 'Febbraio: seconda metà del mese, in vista del weekend di Carnevale. Impulso sui dolci e sui prodotti per le feste dei bambini.',
  '2026-12': 'Metà maggio: prime giornate calde, apertura della stagione dei gelati e delle bevande fredde. Crescono freschi e grigliate nel weekend.',
  '2026-13': 'Ottobre medio: ottimale per le scorte invernali di drogheria e freddo. Clima in raffreddamento spinge bevande calde e piatti pronti.',
  '2026-21': 'Fine febbraio / inizio marzo: clima ancora invernale ma con i primi accenni primaverili. Ideale per promo su prodotti freschi e gelati anticipati.',
  '2026-22': 'Ultima settimana di maggio: pienamente in stagione estiva, ottima per bevande, gelati e prodotti da aperitivo.',
  '2026-23': 'Metà ottobre: fase di piena ripresa autunnale. Birre artigianali e salutistici sono le categorie su cui la concorrenza è più attiva.',
};

function buildPromoHistory(promo) {
  const code = promo.codice;
  const q = promo.quadrimestre;
  const canale = promo.canale;

  const qKey = q === 1 ? 'Q1' : q === 2 ? 'Q2' : 'Q3';
  const h = hashFloat(code, 'promo');

  const baseRevenue = canale === 'Ipermercati' ? 1_800_000 : canale === 'Integrati' ? 2_500_000 : 1_200_000;
  const totalRevenue = Math.round(baseRevenue * (0.85 + h * 0.35));
  const avgLift = +(1.15 + hashFloat(code, 'lift') * 0.55).toFixed(2);
  const cardActivations = Math.round((canale === 'Ipermercati' ? 18000 : canale === 'Integrati' ? 32000 : 12000) * (0.80 + hashFloat(code, 'card') * 0.45));
  const customerReach = Math.round(cardActivations * (3.5 + hashFloat(code, 'reach') * 2.5));

  return {
    prevYearResult: {
      totalRevenue,
      avgLift,
      cardActivations,
      customerReach,
    },
    competitorActivity:
      COMPETITOR_TEXTS[qKey] ||
      'Attività promozionale competitor nella norma stagionale.',
    seasonalContext:
      SEASONAL_TEXTS[code] ||
      `Promozione ${code} (${promo.canale}, Q${q}): contesto stagionale standard per il periodo.`,
  };
}

export const PROMO_HISTORY = {};
for (const promo of PROMOZIONI) {
  PROMO_HISTORY[promo.codice] = buildPromoHistory(promo);
}

// ---------------------------------------------------------------------------
// REPARTO_BENCHMARKS builder
// ---------------------------------------------------------------------------

const REPARTO_DATA = {
  '01': {
    avgMargin: 0.22,
    avgPromoLift: 1.35,
    cardPenetration: 0.62,
    shelfSpaceValue: 7,
    trend: 'stable',
  },
  '02': {
    avgMargin: 0.20,
    avgPromoLift: 1.45,
    cardPenetration: 0.55,
    shelfSpaceValue: 6,
    trend: 'growing',
  },
  '03': {
    avgMargin: 0.28,
    avgPromoLift: 1.25,
    cardPenetration: 0.70,
    shelfSpaceValue: 8,
    trend: 'stable',
  },
  '04': {
    avgMargin: 0.26,
    avgPromoLift: 1.40,
    cardPenetration: 0.58,
    shelfSpaceValue: 7,
    trend: 'stable',
  },
  '05': {
    avgMargin: 0.32,
    avgPromoLift: 1.30,
    cardPenetration: 0.60,
    shelfSpaceValue: 6,
    trend: 'stable',
  },
  '06': {
    avgMargin: 0.35,
    avgPromoLift: 1.28,
    cardPenetration: 0.52,
    shelfSpaceValue: 7,
    trend: 'growing',
  },
  '07': {
    avgMargin: 0.30,
    avgPromoLift: 1.22,
    cardPenetration: 0.65,
    shelfSpaceValue: 5,
    trend: 'growing',
  },
  '08': {
    avgMargin: 0.35,
    avgPromoLift: 1.30,
    cardPenetration: 0.68,
    shelfSpaceValue: 9,
    trend: 'stable',
  },
  '09': {
    avgMargin: 0.25,
    avgPromoLift: 1.20,
    cardPenetration: 0.50,
    shelfSpaceValue: 4,
    trend: 'declining',
  },
  '86': {
    avgMargin: 0.40,
    avgPromoLift: 1.15,
    cardPenetration: 0.45,
    shelfSpaceValue: 8,
    trend: 'growing',
  },
  '87': {
    avgMargin: 0.38,
    avgPromoLift: 1.10,
    cardPenetration: 0.40,
    shelfSpaceValue: 6,
    trend: 'growing',
  },
  '88': {
    avgMargin: 0.30,
    avgPromoLift: 1.20,
    cardPenetration: 0.72,
    shelfSpaceValue: 9,
    trend: 'stable',
  },
  '89': {
    avgMargin: 0.32,
    avgPromoLift: 1.18,
    cardPenetration: 0.66,
    shelfSpaceValue: 8,
    trend: 'stable',
  },
  '90': {
    avgMargin: 0.38,
    avgPromoLift: 1.50,
    cardPenetration: 0.42,
    shelfSpaceValue: 5,
    trend: 'declining',
  },
  '91': {
    avgMargin: 0.42,
    avgPromoLift: 1.55,
    cardPenetration: 0.38,
    shelfSpaceValue: 4,
    trend: 'declining',
  },
  '92': {
    avgMargin: 0.40,
    avgPromoLift: 1.48,
    cardPenetration: 0.40,
    shelfSpaceValue: 5,
    trend: 'declining',
  },
  '93': {
    avgMargin: 0.30,
    avgPromoLift: 1.20,
    cardPenetration: 0.35,
    shelfSpaceValue: 3,
    trend: 'declining',
  },
  '95': {
    avgMargin: 0.05,
    avgPromoLift: 1.00,
    cardPenetration: 0.90,
    shelfSpaceValue: 2,
    trend: 'stable',
  },
  '99': {
    avgMargin: 0.00,
    avgPromoLift: 1.00,
    cardPenetration: 0.20,
    shelfSpaceValue: 1,
    trend: 'stable',
  },
};

export const REPARTO_BENCHMARKS = {};
for (const reparto of REPARTI) {
  const known = REPARTO_DATA[reparto.code];
  if (known) {
    REPARTO_BENCHMARKS[reparto.code] = {
      name: reparto.name,
      familyCount: reparto.count,
      ...known,
    };
  } else {
    // Deterministic fallback
    const h = hashFloat(reparto.code, 'rep');
    REPARTO_BENCHMARKS[reparto.code] = {
      name: reparto.name,
      familyCount: reparto.count,
      avgMargin: +(0.18 + h * 0.25).toFixed(2),
      avgPromoLift: +(1.15 + hashFloat(reparto.code, 'lift') * 0.40).toFixed(2),
      cardPenetration: +(0.40 + hashFloat(reparto.code, 'card') * 0.35).toFixed(2),
      shelfSpaceValue: hashInt(reparto.code, 'ssv', 3, 8),
      trend: hashPick(reparto.code, 'trend', ['growing', 'stable', 'declining']),
    };
  }
}
