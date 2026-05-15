const REPARTI = [
  {
    "code": "01",
    "name": "DROGHERIA ALIMENTARE",
    "count": 82
  },
  {
    "code": "02",
    "name": "BEVANDE",
    "count": 22
  },
  {
    "code": "03",
    "name": "FRESCO",
    "count": 37
  },
  {
    "code": "04",
    "name": "FREDDO",
    "count": 9
  },
  {
    "code": "05",
    "name": "CURA CASA",
    "count": 20
  },
  {
    "code": "06",
    "name": "CURA PERSONA",
    "count": 32
  },
  {
    "code": "07",
    "name": "PET CARE",
    "count": 3
  },
  {
    "code": "08",
    "name": "ORTOFRUTTA",
    "count": 28
  },
  {
    "code": "09",
    "name": "GENERI VARI",
    "count": 1
  },
  {
    "code": "86",
    "name": "SUSHI",
    "count": 2
  },
  {
    "code": "87",
    "name": "SOMMINISTRAZIONE",
    "count": 10
  },
  {
    "code": "88",
    "name": "CARNE",
    "count": 6
  },
  {
    "code": "89",
    "name": "PESCE",
    "count": 4
  },
  {
    "code": "90",
    "name": "BAZAR LEGGERO",
    "count": 24
  },
  {
    "code": "91",
    "name": "TESSILE",
    "count": 11
  },
  {
    "code": "92",
    "name": "BAZAR PESANTE",
    "count": 11
  },
  {
    "code": "93",
    "name": "NON FOOD GENERICO",
    "count": 2
  },
  {
    "code": "95",
    "name": "MAT.CONSUMO/PREMI/BUONI SCONTO",
    "count": 1
  },
  {
    "code": "99",
    "name": "MAT.PRIME/CAUZIONI/NON CLASS.",
    "count": 2
  }
];

export const REPARTO_TO_SPAZI = {
  "01": [
    "Drogheria",
    "Murale"
  ],
  "02": [
    "Bevande"
  ],
  "03": [
    "B.co Salumi",
    "B.co Gastronomia",
    "B.co Formaggi",
    "B.co Panetteria"
  ],
  "04": [
    "Surgelati"
  ],
  "05": [
    "Cura Casa"
  ],
  "06": [
    "Cura Persona"
  ],
  "07": [
    "Pet Care"
  ],
  "08": [
    "B.co Ortofrutta"
  ],
  "09": [
    "Pluricategoria"
  ],
  "86": [
    "B.co Pesce"
  ],
  "87": [
    "Iniziative Speciali"
  ],
  "88": [
    "B.co Carne"
  ],
  "89": [
    "B.co Pesce"
  ],
  "90": [
    "No Food"
  ],
  "91": [
    "No Food"
  ],
  "92": [
    "No Food"
  ],
  "93": [
    "No Food"
  ],
  "95": [],
  "99": []
};

export default REPARTI;
