// Seed for deterministic pseudo-random numbers
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const RAW_FAMIGLIE = [
  { rc: "01", rn: "DROGHERIA ALIMENTARE", fc: "01010101", fn: "PASTICCERIA SFOGLIA", v: 14123.32, m: 0.3029, inc: 0.1323, m1: 4954.56, m2: 2856.97, m3: 2884.2, m4: 3427.59, ps: 0.0095 },
  { rc: "01", rn: "DROGHERIA ALIMENTARE", fc: "01010102", fn: "PASTICCERIA RICOPERTA/GOCCE CIOC", v: 13960.84, m: 0.2358, inc: 0.1308, m1: 4233.87, m2: 2961.57, m3: 3174.13, m4: 3591.27, ps: 0.0084 },
  { rc: "01", rn: "DROGHERIA ALIMENTARE", fc: "01010103", fn: "PASTICCERIA RIPIENA", v: 11866.62, m: 0.3426, inc: 0.1112, m1: 2874.8, m2: 2837.94, m3: 2255.31, m4: 3898.57, ps: 0.0072 },
  { rc: "01", rn: "DROGHERIA ALIMENTARE", fc: "01010104", fn: "PASTICCERIA SANDWICHES", v: 6093.64, m: 0.3421, inc: 0.0571, m1: 1680.24, m2: 1366.33, m3: 1435.8, m4: 1611.27, ps: 0.0028 },
  { rc: "01", rn: "DROGHERIA ALIMENTARE", fc: "01010105", fn: "Pasticceria Altra Unitipo", v: 48003.6, m: 0.4602, inc: 0.4498, m1: 12810.85, m2: 9806.24, m3: 10739.43, m4: 14647.08, ps: 0.0253 },
  { rc: "02", rn: "BEVANDE", fc: "02010103", fn: "ACQUA GASSATA 0-50 CL", v: 27692.65, m: 0.8143, inc: 0.1801, m1: 5587.59, m2: 7720.4, m3: 6902.42, m4: 7482.24, ps: 0.0184 },
  { rc: "02", rn: "BEVANDE", fc: "02010104", fn: "ACQUA GASSATA 51-100 CL", v: 12965.7, m: 0.5044, inc: 0.0843, m1: 2095.04, m2: 4352.03, m3: 3152.93, m4: 3365.7, ps: 0.0052 },
  { rc: "02", rn: "BEVANDE", fc: "02010105", fn: "ACQUA GASSATA 101-150 CL", v: 113062.54, m: 0.4392, inc: 0.7355, m1: 22645.35, m2: 29525.55, m3: 31782.71, m4: 29108.93, ps: 0.0651 },
  { rc: "02", rn: "BEVANDE", fc: "02010203", fn: "ACQUA LIEV. GASSATA 0-50 CL", v: 592.07, m: 0.4967, inc: 0.0374, m1: 272.43, m2: 319.64, m3: 0, m4: 0, ps: 0.001 },
  { rc: "02", rn: "BEVANDE", fc: "02010205", fn: "ACQUA LIEV. GASSATA 101-150 CL", v: 15227.38, m: 0.8749, inc: 0.9626, m1: 3275.89, m2: 3910.52, m3: 4003, m4: 4037.97, ps: 0.0058 },
  { rc: "03", rn: "FRESCO", fc: "03010101", fn: "Mozzarelle Bufala", v: 79074.85, m: 0.4538, inc: 0.1649, m1: 17387.37, m2: 22424.33, m3: 19847.21, m4: 19415.94, ps: 0.028 },
  { rc: "03", rn: "FRESCO", fc: "03010102", fn: "Mozzarelle Latte Vaccino", v: 362006.43, m: 0.293, inc: 0.7551, m1: 79206.66, m2: 94012.72, m3: 95752.09, m4: 93034.96, ps: 0.1644 },
  { rc: "03", rn: "FRESCO", fc: "03010105", fn: "MOZZARELLE LIGHT", v: 18070.88, m: 0.4102, inc: 0.0377, m1: 3941.27, m2: 4612.26, m3: 4912.82, m4: 4604.53, ps: 0.0086 },
  { rc: "03", rn: "FRESCO", fc: "03010106", fn: "MOZZARELLE DELATTOSATE", v: 20265.68, m: 0.4125, inc: 0.0423, m1: 3883.4, m2: 5037.5, m3: 5629.14, m4: 5715.64, ps: 0.0097 },
  { rc: "03", rn: "FRESCO", fc: "03010201", fn: "BURRATA", v: 27262.21, m: 0.4605, inc: 0.4123, m1: 5448.06, m2: 6942.53, m3: 8198.23, m4: 6673.39, ps: 0.0119 },
  { rc: "04", rn: "FREDDO", fc: "04010105", fn: "Gelati Impulso Coppa Gelato", v: 5385.76, m: 0.8453, inc: 0.3778, m1: 794.91, m2: 1833.13, m3: 1494.39, m4: 1263.33, ps: 0.0027 },
  { rc: "04", rn: "FREDDO", fc: "04010107", fn: "GELATI IMPULSO GHIACCIOLO", v: 8871.49, m: 1.9035, inc: 0.6222, m1: 1539.53, m2: 2927.19, m3: 2240.85, m4: 2163.92, ps: 0.0037 },
  { rc: "04", rn: "FREDDO", fc: "04010201", fn: "GELATI VASCHETTE < 299 GR", v: 29357.97, m: 0.5236, inc: 0.1432, m1: 8427.97, m2: 8463.87, m3: 6340.94, m4: 6125.19, ps: 0.0129 },
  { rc: "04", rn: "FREDDO", fc: "04010202", fn: "GELATI VASCHETTE 300-600 GR", v: 156081.5, m: 0.3873, inc: 0.7613, m1: 21358.21, m2: 43010.06, m3: 48497.99, m4: 43215.24, ps: 0.0487 },
  { rc: "04", rn: "FREDDO", fc: "04010203", fn: "GELATI VASCHETTE 601-1000 GR", v: 13378.64, m: 0.4321, inc: 0.0653, m1: 2350.96, m2: 4243.54, m3: 4170.04, m4: 2614.1, ps: 0.0047 },
  { rc: "05", rn: "CURA CASA", fc: "05010101", fn: "PIC. SUPERFICI ABRASIVI POLVERE", v: 554.52, m: 0.6243, inc: 0.0068, m1: 158.39, m2: 123.74, m3: 146.94, m4: 125.45, ps: 0.0007 },
  { rc: "05", rn: "CURA CASA", fc: "05010102", fn: "PIC. SUPERFICI ABRASIVI CREMA", v: 2642.99, m: 0.3541, inc: 0.0325, m1: 689.94, m2: 697.19, m3: 653.7, m4: 602.16, ps: 0.0023 },
  { rc: "05", rn: "CURA CASA", fc: "05010104", fn: "Piccole Superfici Salviettine", v: 2615.37, m: 0.5175, inc: 0.0321, m1: 545.68, m2: 587.81, m3: 667.46, m4: 814.42, ps: 0.0018 },
  { rc: "05", rn: "CURA CASA", fc: "05010105", fn: "PIC. SUPERFICI BAGNO/DOCCIA", v: 13499.71, m: 0.312, inc: 0.1658, m1: 3471.4, m2: 2932.32, m3: 3775.29, m4: 3320.7, ps: 0.0091 },
  { rc: "05", rn: "CURA CASA", fc: "05010106", fn: "PIC. SUPERFICI SGRASSATORI", v: 43564.89, m: 0.2672, inc: 0.5351, m1: 13736, m2: 7987.76, m3: 10440.02, m4: 11401.11, ps: 0.0283 },
  { rc: "06", rn: "CURA PERSONA", fc: "06010101", fn: "Cotone Fiocco", v: 182.13, m: 0.4446, inc: 0.0113, m1: 39.63, m2: 54.04, m3: 46.09, m4: 42.37, ps: 0.0006 },
  { rc: "06", rn: "CURA PERSONA", fc: "06010102", fn: "Cotone Zig Zag", v: 471.65, m: 0.3957, inc: 0.0292, m1: 138.43, m2: 108.85, m3: 106.78, m4: 117.59, ps: 0.0007 },
  { rc: "06", rn: "CURA PERSONA", fc: "06010103", fn: "Cotone Pretagliato", v: 906.74, m: 0.6049, inc: 0.0562, m1: 243.41, m2: 236.95, m3: 225.37, m4: 201.01, ps: 0.0013 },
  { rc: "06", rn: "CURA PERSONA", fc: "06010104", fn: "Cotone Dischetti", v: 14575.34, m: 0.5473, inc: 0.9033, m1: 4706.28, m2: 3603.2, m3: 3159.38, m4: 3106.48, ps: 0.0158 },
  { rc: "06", rn: "CURA PERSONA", fc: "06010200", fn: "Bastoncini Cotone", v: 7554.36, m: 0.7502, inc: 1, m1: 2193.24, m2: 1762.32, m3: 1863.99, m4: 1734.81, ps: 0.0098 },
  { rc: "07", rn: "PET CARE", fc: "07010101", fn: "NUTRIZIONE CANE UMIDO", v: 75538.1, m: 0.4705, inc: 0.4283, m1: 17754.2, m2: 17863.97, m3: 18800.31, m4: 21119.62, ps: 0.0262 },
  { rc: "07", rn: "PET CARE", fc: "07010102", fn: "NUTRIZIONE CANE SECCO", v: 63355.65, m: 0.3553, inc: 0.3592, m1: 15824.35, m2: 15821.56, m3: 14593.76, m4: 17115.98, ps: 0.0157 },
  { rc: "07", rn: "PET CARE", fc: "07010103", fn: "NUTRIZIONE CANE SNACK", v: 37476.42, m: 0.4678, inc: 0.2125, m1: 10038.6, m2: 9053.71, m3: 8913.37, m4: 9470.74, ps: 0.0167 },
  { rc: "07", rn: "PET CARE", fc: "07010201", fn: "IGIENE CANE ANTIPARASSITARI", v: 7486.89, m: 0.2831, inc: 0.3959, m1: 1849.84, m2: 2461.37, m3: 1488.65, m4: 1687.03, ps: 0.001 },
  { rc: "07", rn: "PET CARE", fc: "07010202", fn: "IGIENE CANE SALUTE", v: 11422.26, m: 0.7025, inc: 0.6041, m1: 2631.14, m2: 2876.2, m3: 2830.04, m4: 3084.88, ps: 0.0042 },
  { rc: "08", rn: "ORTOFRUTTA", fc: "08010201", fn: "VERDURA IV GAMMA DA CUOCERE", v: 8419.13, m: 0.588, inc: 0.0429, m1: 3173.69, m2: 2051.18, m3: 1414.98, m4: 1779.28, ps: 0.0049 },
  { rc: "08", rn: "ORTOFRUTTA", fc: "08010202", fn: "VERDURA IV GAMMA CRUDITE", v: 9794.25, m: 0.861, inc: 0.05, m1: 2463.01, m2: 2541.26, m3: 2405.69, m4: 2384.29, ps: 0.0113 },
  { rc: "08", rn: "ORTOFRUTTA", fc: "08010203", fn: "INSALATE TENERE UNI IV GAMMA", v: 70762.91, m: 0.7639, inc: 0.361, m1: 18460.6, m2: 17982.79, m3: 16826.95, m4: 17492.57, ps: 0.0613 },
  { rc: "08", rn: "ORTOFRUTTA", fc: "08010204", fn: "INSALATE CROCCANTI IV GAMMA", v: 18991.78, m: 0.7913, inc: 0.0969, m1: 4687.83, m2: 4598.52, m3: 4468.48, m4: 5236.95, ps: 0.0131 },
  { rc: "08", rn: "ORTOFRUTTA", fc: "08010205", fn: "INSALATE MISTE IV GAMMA", v: 72772.71, m: 0.5684, inc: 0.3712, m1: 19734.06, m2: 18007.11, m3: 16989.06, m4: 18042.48, ps: 0.0583 },
  { rc: "86", rn: "SUSHI", fc: "86010000", fn: "SUSHI PESCE", v: 55878.75, m: 0.1542, inc: 0.5, m1: 14755.66, m2: 14919.78, m3: 12463.63, m4: 13739.68, ps: 0.0072 },
  { rc: "86", rn: "SUSHI", fc: "86010100", fn: "SUSHI PESCE PREMIUM", v: 43783.24, m: 0.1506, inc: 0.35, m1: 11993.94, m2: 10872.71, m3: 10442.73, m4: 10473.86, ps: 0.0072 },
  { rc: "86", rn: "SUSHI", fc: "86020000", fn: "SUSHI ALTRO", v: 25597.03, m: 0.1609, inc: 0.1, m1: 6644.08, m2: 5845.46, m3: 6625.73, m4: 6481.76, ps: 0.0054 },
  { rc: "86", rn: "SUSHI", fc: "86020100", fn: "SUSHI VEGETARIANO", v: 21594.09, m: 0.0579, inc: 0.05, m1: 5847.8, m2: 5498.23, m3: 5478.52, m4: 4769.54, ps: 0.0056 },
  { rc: "88", rn: "CARNE", fc: "88010101", fn: "BOVINO ADULTO", v: 301212.17, m: 0.5971, inc: 0.9878, m1: 73883.35, m2: 67249.88, m3: 72215.3, m4: 87863.64, ps: 0.0472 },
  { rc: "88", rn: "CARNE", fc: "88010103", fn: "BOVINO SCOTTONA", v: 5.97, m: 0.6245, inc: 0.0, m1: 1.99, m2: 3.98, m3: 0, m4: 0, ps: 0.0005 },
  { rc: "88", rn: "CARNE", fc: "88010104", fn: "BOVINO VITELLO", v: 3727.2, m: 0.255, inc: 0.0122, m1: 1088.73, m2: 1022.91, m3: 698.95, m4: 916.61, ps: 0.001 },
  { rc: "88", rn: "CARNE", fc: "88010201", fn: "EQUINO CAVALLO", v: 1404.2, m: 0.4695, inc: 1, m1: 397.47, m2: 354.84, m3: 326.79, m4: 325.1, ps: 0.0007 },
  { rc: "88", rn: "CARNE", fc: "88010301", fn: "AGNELLO DA LATTE", v: 2723.6, m: 0.538, inc: 0.6002, m1: 1948, m2: 171.57, m3: 0, m4: 604.03, ps: 0.0009 },
  { rc: "89", rn: "PESCE", fc: "89010101", fn: "PESCE FRESCO INTERI", v: 113365.53, m: 0.4627, inc: 0.5298, m1: 30390.99, m2: 25275.14, m3: 25171.2, m4: 32528.2, ps: 0.0171 },
  { rc: "89", rn: "PESCE", fc: "89010102", fn: "PESCE FRESCO FILETTI", v: 96122.18, m: 0.488, inc: 0.4492, m1: 26390.02, m2: 23956.72, m3: 23643.69, m4: 22131.75, ps: 0.0169 },
  { rc: "89", rn: "PESCE", fc: "89010103", fn: "PESCE FRESCO TRANCI", v: 4486.44, m: 0.671, inc: 0.021, m1: 292.05, m2: 1636.67, m3: 997.17, m4: 1560.55, ps: 0.0015 },
  { rc: "89", rn: "PESCE", fc: "89010201", fn: "PESCE FRESCO CROSTACEI", v: 12596.85, m: 0.6293, inc: 1, m1: 3816.36, m2: 2404.3, m3: 3102.97, m4: 3273.22, ps: 0.0032 },
  { rc: "89", rn: "PESCE", fc: "89010301", fn: "PESCE FRESCO MOLLUSCHI BIVALVI", v: 31016.85, m: 0.357, inc: 0.4767, m1: 5800.85, m2: 7441.9, m3: 7534.58, m4: 10239.52, ps: 0.0037 },
  { rc: "90", rn: "BAZAR LEGGERO", fc: "90010101", fn: "Bicchieri", v: 10448.24, m: 0.6426, inc: 0.2376, m1: 2467.17, m2: 2262.04, m3: 2678.76, m4: 3040.27, ps: 0.0022 },
  { rc: "90", rn: "BAZAR LEGGERO", fc: "90010102", fn: "BOTTIGLIE E CARAFFE VETRO", v: 2873.72, m: 0.743, inc: 0.0653, m1: 693.97, m2: 694.55, m3: 828.86, m4: 656.34, ps: 0.0011 },
  { rc: "90", rn: "BAZAR LEGGERO", fc: "90010103", fn: "INSALATIERE E COPPE", v: 4852.51, m: 0.6377, inc: 0.1103, m1: 1426.98, m2: 1472.64, m3: 1122.87, m4: 830.02, ps: 0.0014 },
  { rc: "90", rn: "BAZAR LEGGERO", fc: "90010104", fn: "Piatti", v: 8600.78, m: 0.578, inc: 0.1956, m1: 2342.78, m2: 2036.16, m3: 2108.49, m4: 2113.35, ps: 0.0015 },
  { rc: "90", rn: "BAZAR LEGGERO", fc: "90010105", fn: "PIATTI PORTATA", v: 6852.44, m: 0.5715, inc: 0.1558, m1: 1997.42, m2: 1033.43, m3: 2177.48, m4: 1644.11, ps: 0.0021 },
  { rc: "91", rn: "TESSILE", fc: "91010101", fn: "Tavola", v: 13972.82, m: 0.7349, inc: 0.1382, m1: 4347.45, m2: 3599.58, m3: 2993.2, m4: 3032.59, ps: 0.0032 },
  { rc: "91", rn: "TESSILE", fc: "91010102", fn: "Cucina", v: 9080.06, m: 0.68, inc: 0.0898, m1: 2896.19, m2: 2171.03, m3: 2337.51, m4: 1675.33, ps: 0.0028 },
  { rc: "91", rn: "TESSILE", fc: "91010103", fn: "TELERIA LETTO E GUANCIALE", v: 53346.81, m: 0.4988, inc: 0.5275, m1: 13226.39, m2: 12522.83, m3: 14173.61, m4: 13423.98, ps: 0.0044 },
  { rc: "91", rn: "TESSILE", fc: "91010104", fn: "BAGNO E SPUGNA MARE", v: 23068.04, m: 0.6622, inc: 0.2281, m1: 3844.27, m2: 6996.85, m3: 5719.75, m4: 6507.17, ps: 0.0035 },
  { rc: "91", rn: "TESSILE", fc: "91010105", fn: "Merceria", v: 1660.64, m: 1.4759, inc: 0.0164, m1: 418.75, m2: 368.79, m3: 453.3, m4: 419.8, ps: 0.0008 },
  { rc: "92", rn: "BAZAR PESANTE", fc: "92010102", fn: "AEROSOL", v: 57.3, m: 0.2762, inc: 0.0025, m1: 0, m2: 57.3, m3: 0, m4: 0, ps: 0.0004 },
  { rc: "92", rn: "BAZAR PESANTE", fc: "92010104", fn: "BILANCIA PESA PERSONE", v: 1482.3, m: 0.6031, inc: 0.0656, m1: 387.71, m2: 281.12, m3: 325.05, m4: 488.42, ps: 0.0005 },
  { rc: "92", rn: "BAZAR PESANTE", fc: "92010105", fn: "DENTAL CARE", v: 221.07, m: 0.8353, inc: 0.0098, m1: 0, m2: 147.38, m3: 0, m4: 73.69, ps: 0.0004 },
  { rc: "92", rn: "BAZAR PESANTE", fc: "92010106", fn: "EPILATORI / DEPILATORI", v: 2824.66, m: 0.4083, inc: 0.1251, m1: 258.86, m2: 1007.41, m3: 854.28, m4: 704.11, ps: 0.0005 },
  { rc: "92", rn: "BAZAR PESANTE", fc: "92010109", fn: "MISURA PRESSIONE", v: 317.7, m: 0.721, inc: 0.0141, m1: 97.11, m2: 49.02, m3: 171.57, m4: 0, ps: 0.0005 },
];

// Map rc codes to reparti budget codes
const RC_TO_REPARTO = {
  "01": "01",
  "02": "02",
  "03": "03",
  "04": "04",
  "05": "05",
  "06": "06",
  "07": "07",
  "08": "08",
  "86": "Sushi",
  "88": "88",
  "89": "89",
  "90": "90",
  "91": "91",
  "92": "92",
};

const PROMO_LABELS = [
  "2026-10 Grande Conv.",
  "2026-09 Sottocosto",
  "2026-08 Al costo",
  "2026-07 Evento 50%",
  null,
];

const rand = seededRandom(42);

const FAMIGLIE = RAW_FAMIGLIE.map((f) => ({
  ...f,
  repartoCode: RC_TO_REPARTO[f.rc] || f.rc,
  storicoVol: Math.floor(rand() * 6),
  storicoPromo: Math.floor(rand() * 6),
  ultimaPromo: PROMO_LABELS[Math.floor(rand() * PROMO_LABELS.length)],
  penultimaPromo: PROMO_LABELS[Math.floor(rand() * PROMO_LABELS.length)],
}));

export default FAMIGLIE;
