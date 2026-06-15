# Integrazione DWH — Strategy Mosaic (lettura, Trino) + Netezza (scrittura)

> Documento di design per collegare la demo *Griglie Promozionali* alle sorgenti
> dati reali. Stato attuale: SPA React statica su GitHub Pages con dati hardcoded
> in `src/data/*.js`. Obiettivo: leggere i dati da **Strategy (MicroStrategy)
> Mosaic** via **driver JDBC Trino** e scrivere le decisioni dei buyer su
> **IBM Netezza** via JDBC.

---

## 1. Vincolo architetturale fondamentale

Una SPA che gira nel browser **non può** aprire connessioni JDBC: JDBC è un
protocollo TCP su driver JVM, mentre il browser parla solo HTTP(S)/WebSocket e
non può custodire credenziali di database. GitHub Pages inoltre serve **solo
file statici** (nessun runtime server-side).

Serve quindi un **backend intermedio** (API layer) che:

1. espone endpoint **REST/JSON** consumati dal frontend;
2. mantiene i **connection pool JDBC** verso Trino e Netezza;
3. custodisce le **credenziali** (Vault / variabili d'ambiente, mai nel client);
4. applica **autenticazione/autorizzazione** (chi può leggere/scrivere quali canali).

```
┌────────────────────┐     HTTPS/JSON      ┌──────────────────────┐
│  Frontend React    │  ───────────────▶   │   Backend API        │
│  (GitHub Pages o    │                     │   (Spring Boot/JVM)  │
│   servito dal BE)   │  ◀───────────────   │                      │
└────────────────────┘                     │  ┌────────────────┐  │
                                            │  │ Trino JDBC pool│──┼──▶ Strategy Mosaic (READ)
                                            │  └────────────────┘  │
                                            │  ┌────────────────┐  │
                                            │  │Netezza JDBC pool│─┼──▶ Netezza DWH (WRITE)
                                            │  └────────────────┘  │
                                            └──────────────────────┘
```

### Stack backend consigliato

**Java 17 + Spring Boot 3** (o Quarkus). Motivazione: sia il driver Trino
(`io.trino:trino-jdbc`) sia il driver Netezza (`nzjdbc.jar`) sono JDBC/JVM. Un
backend JVM li usa nativamente con HikariCP per il pooling. (Un backend Node
richiederebbe un bridge JDBC fragile: sconsigliato per Netezza.)

| Componente | Tecnologia |
|---|---|
| Web framework | Spring Boot 3 (Web, Validation) |
| Connection pool | HikariCP (uno per datasource) |
| Driver lettura | `io.trino:trino-jdbc:<versione cluster>` |
| Driver scrittura | IBM Netezza JDBC (`nzjdbc3.jar`, da installare in repo Maven interno) |
| Mapping | JdbcTemplate / MyBatis (niente ORM pesante: query analitiche) |
| Auth | OAuth2/OIDC aziendale o token; CORS verso l'origin del frontend |
| Segreti | HashiCorp Vault o env vars iniettate dal deploy |

---

## 2. Struttura dati attuale (frontend) → mapping sorgenti

Il frontend usa oggi 4 dataset (in `src/data/`). Vanno sostituiti con fetch HTTP.
Di seguito lo **shape attuale** e la **sorgente reale** corrispondente.

### 2.1 `promozioni.js` → Mosaic (Trino) — anagrafica promo / brief
Shape per oggetto promo (invariato lato frontend):
```
{ canale, codice, numero, anno, quadrimestre, dataInizio, dataFine,
  tema, temaCod, sottotema, sottotemaCod,
  speciale1..3 (+Cod), speciale4Aff (+Cod),
  ruoloTema (+Cod), formato (+Cod), agsSconti, puntiJolly,
  temaAggNoFood, temaVolExtra, temaVolStagNoFood, label }
```
Sorgente: tabella/cubo brief promo (in Excel era `Riepilogo_Promo`).

### 2.2 `anagrafica.js` → Mosaic (Trino) — gerarchia famiglie IV livello ECR
```
{ fc, fn, rc, rn, gc, gn, sc, sn }   // famiglia, reparto, gruppo, settore
```
Sorgente: anagrafica merceologica (in Excel `AnagraficaFamiglie`).

### 2.3 `metrics.js` → Mosaic (Trino) — KPI per (promo × famiglia)
Per `[promoCode][fc]`:
```
{ v, m, inc, m1, m2, m3, m4, ps,        // vendite, margine, incidenza, mesi, scontrini
  penultima, ultima, nVol, nPromo,      // storico volantino
  tema, temaC, sotto, sottoC, s1, s1C, ...}  // assegnazioni storiche (riferimento)
```
Sorgente: fact di supporto decisione (in Excel `DB_Griglia`, 2.763 righe).

### 2.4 `spazi.js` → Mosaic (Trino) — budget spazi per (promo × sezione × reparto)
Per `[promoCode][sezione]`:
```
{ prod, card, pag, byReparto: { <repartoSpazi>: { prod, card, pag } } }
```
Sorgente: piano spazi marketing (in Excel `DB_Spazi`, 1.026 righe).

### 2.5 Stato di lavoro (OUTPUT) → Netezza (write)
Lo stato editabile è:
```
selections[familyCode][sectionKey] = { p: <numero slot PROD>, c: <numero slot CARD> }
sectionKey ∈ { tema, sotto, s1, s2, s3, s4 }
```
Questo è ciò che va **persistito su Netezza** ad ogni "Salva" e ad ogni "Invia Dati".

---

## 3. Schema Netezza (scrittura risultati)

Modello a griglia "lungo" (una riga per slot-decisione), il più adatto sia al
riuso analitico sia all'idempotenza degli upsert.

```sql
-- Tabella principale: decisioni della griglia promozionale
CREATE TABLE GRIGLIE_PROMO_DECISIONI (
    CANALE             VARCHAR(20)   NOT NULL,   -- Integrati | Ipermercati | Supermercati
    CODICE_PROMO       VARCHAR(10)   NOT NULL,   -- es. 2026-13
    FAMIGLIA_COD       VARCHAR(12)   NOT NULL,   -- IV livello ECR (fc)
    SEZIONE            VARCHAR(12)   NOT NULL,   -- tema|sotto|s1|s2|s3|s4
    PROD_COUNT         INTEGER       NOT NULL DEFAULT 0,  -- n. slot a volantino
    CARD_COUNT         INTEGER       NOT NULL DEFAULT 0,  -- n. slot card
    -- audit / lineage
    UTENTE             VARCHAR(80)   NOT NULL,
    DATA_MODIFICA      TIMESTAMP     NOT NULL,
    BATCH_ID           VARCHAR(40)   NOT NULL,   -- id invio (UUID per ogni "Invia Dati")
    ORIGINE            VARCHAR(20)   NOT NULL    -- 'MANUALE' | 'AI' | 'AI_MODIFICATO'
)
DISTRIBUTE ON (CODICE_PROMO);

-- Header di ogni invio (1 riga per "Invia Dati")
CREATE TABLE GRIGLIE_PROMO_INVII (
    BATCH_ID           VARCHAR(40)   NOT NULL,
    CANALE             VARCHAR(20)   NOT NULL,
    CODICE_PROMO       VARCHAR(10),               -- NULL = invio multi-promo (intero piano)
    UTENTE             VARCHAR(80)   NOT NULL,
    DATA_INVIO         TIMESTAMP     NOT NULL,
    N_RIGHE            INTEGER       NOT NULL,
    TOT_PROD           INTEGER       NOT NULL,
    TOT_CARD           INTEGER       NOT NULL,
    NOTE               VARCHAR(500)
)
DISTRIBUTE ON (BATCH_ID);
```

Note di design:
- Netezza **non ha vincoli di unicità forzati**: l'idempotenza si gestisce con
  pattern *delete-then-insert* per `(CANALE, CODICE_PROMO, BATCH_ID)` dentro una
  transazione, oppure scrivendo sempre un nuovo `BATCH_ID` e leggendo l'ultimo
  (append-only + viste "latest"). **Consigliato append-only** per audit completo.
- Riga scritta solo se `PROD_COUNT > 0 OR CARD_COUNT > 0` (la griglia è sparsa).
- `ORIGINE` traccia se la riga nasce da suggerimento AI accettato, modificato o
  inserimento manuale: utile per misurare l'adozione del motore.

Vista "ultimo stato per promo":
```sql
CREATE VIEW V_GRIGLIE_PROMO_LATEST AS
SELECT d.*
FROM GRIGLIE_PROMO_DECISIONI d
JOIN (
    SELECT CANALE, CODICE_PROMO, MAX(DATA_MODIFICA) AS MAXTS
    FROM GRIGLIE_PROMO_DECISIONI
    GROUP BY CANALE, CODICE_PROMO
) last ON d.CANALE = last.CANALE
      AND d.CODICE_PROMO = last.CODICE_PROMO
      AND d.DATA_MODIFICA = last.MAXTS;
```

---

## 4. Lettura da Strategy Mosaic (Trino JDBC)

Trino espone il semantic layer Mosaic come catalogo SQL. Le query restituiscono
esattamente le colonne che il frontend usa oggi. Esempi (i nomi di
catalog/schema/tabella vanno adattati al deployment Mosaic).

```sql
-- 4.1 Anagrafica promo (brief)
SELECT canale, codice_promo AS codice, numero_promo AS numero, anno, quadrimestre,
       data_inizio, data_fine,
       tema, tema_cod, sottotema, sottotema_cod,
       speciale1, speciale1_cod, speciale2, speciale2_cod, speciale3, speciale3_cod,
       speciale4_aff, speciale4_aff_cod,
       ruolo_tema, ruolo_tema_cod, formato, formato_cod,
       ags_sconti, punti_jolly, tema_agg_nofood, tema_vol_extra, tema_vol_stag_nofood
FROM   mosaic.promo.riepilogo_promo
WHERE  anno = ?;

-- 4.2 Anagrafica famiglie merceologiche
SELECT famiglia_cod AS fc, famiglia_desc AS fn,
       reparto_cod AS rc, reparto_desc AS rn,
       gruppo_cod  AS gc, gruppo_desc  AS gn,
       settore_cod AS sc, settore_desc AS sn
FROM   mosaic.anagrafica.famiglie_iv_ecr;

-- 4.3 KPI di supporto decisione per (promo × famiglia)
SELECT codice_promo, famiglia_cod AS fc,
       vendite_nette AS v, margine_medio AS m, incidenza AS inc,
       vendite_m1 AS m1, vendite_m2 AS m2, vendite_m3 AS m3, vendite_m4 AS m4,
       perc_scontrini AS ps,
       penultima_promo_vol AS penultima, ultima_promo_vol AS ultima,
       n_volte_volantino AS nvol, n_volte_promo AS npromo
FROM   mosaic.fact.griglia_supporto
WHERE  codice_promo IN (?);

-- 4.4 Budget spazi per (promo × sezione × reparto)
SELECT codice_promo, sezione, reparto_spazi AS reparto,
       SUM(pag) AS pag, SUM(prod) AS prod, SUM(card) AS card
FROM   mosaic.fact.spazi_marketing
WHERE  codice_promo IN (?)
GROUP  BY codice_promo, sezione, reparto_spazi;
```

JDBC URL Trino (esempio):
```
jdbc:trino://mosaic-trino.host:443/mosaic?SSL=true
```
Autenticazione: `user` + (token JWT/OAuth o password LDAP) secondo la
configurazione del cluster. HikariCP con `maximumPoolSize` contenuto (Trino è
un motore di query, non un OLTP: pool 5–10).

---

## 5. Contratto API REST (cosa chiama il frontend)

Sostituisce gli `import` statici da `src/data/*`. Tutti JSON.

| Metodo | Endpoint | Scopo | Sorgente |
|---|---|---|---|
| GET | `/api/canali` | elenco canali | costante / Mosaic |
| GET | `/api/promozioni?anno=2026&canale=Ipermercati` | anagrafica promo | Trino 4.1 |
| GET | `/api/anagrafica-famiglie` | gerarchia merceologica | Trino 4.2 (cacheabile) |
| GET | `/api/metrics?promo=2026-13` | KPI famiglie per promo | Trino 4.3 |
| GET | `/api/spazi?promo=2026-13` | budget spazi/sezioni | Trino 4.4 |
| GET | `/api/griglia?canale=..&promo=..` | ultimo stato salvato | Netezza (V_..._LATEST) |
| PUT | `/api/griglia` | **Salva** (bozza) | Netezza insert ORIGINE=MANUALE |
| POST | `/api/griglia/invia` | **Invia Dati** (commit) | Netezza insert + header INVII |
| GET | `/api/griglia/ultimo-invio?canale=..` | timestamp ultimo invio DWH | Netezza INVII |

Esempio payload `POST /api/griglia/invia`:
```json
{
  "canale": "Ipermercati",
  "codicePromo": "2026-13",
  "utente": "aveneselli",
  "origine": "AI_MODIFICATO",
  "righe": [
    { "famigliaCod": "01010102", "sezione": "tema",  "prod": 3, "card": 1 },
    { "famigliaCod": "02010105", "sezione": "s1",    "prod": 2, "card": 0 }
  ]
}
```
Risposta:
```json
{ "batchId": "9f2c…", "dataInvio": "2026-06-15T11:23:04Z", "nRighe": 2, "totProd": 5, "totCard": 1 }
```

La trasformazione `selections → righe[]` è banale (già in questo formato in
memoria): vedi `buildSelectionsFromAccepted` e lo stato `selections` nel hook.

---

## 6. Scrittura su Netezza — pattern consigliato

```java
// Pseudocodice servizio (Spring + JdbcTemplate, datasource "netezza")
@Transactional("netezzaTx")
public InvioResult invia(GrigliaInvioRequest req) {
    String batchId = UUID.randomUUID().toString();
    Timestamp now = Timestamp.from(Instant.now());

    // Netezza: batch insert efficiente
    jdbc.batchUpdate(
      "INSERT INTO GRIGLIE_PROMO_DECISIONI " +
      "(CANALE,CODICE_PROMO,FAMIGLIA_COD,SEZIONE,PROD_COUNT,CARD_COUNT,UTENTE,DATA_MODIFICA,BATCH_ID,ORIGINE) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?)",
      req.righe(), 500, (ps, r) -> {
        ps.setString(1, req.canale());
        ps.setString(2, req.codicePromo());
        ps.setString(3, r.famigliaCod());
        ps.setString(4, r.sezione());
        ps.setInt(5, r.prod());
        ps.setInt(6, r.card());
        ps.setString(7, req.utente());
        ps.setTimestamp(8, now);
        ps.setString(9, batchId);
        ps.setString(10, req.origine());
      });

    jdbc.update(
      "INSERT INTO GRIGLIE_PROMO_INVII " +
      "(BATCH_ID,CANALE,CODICE_PROMO,UTENTE,DATA_INVIO,N_RIGHE,TOT_PROD,TOT_CARD,NOTE) " +
      "VALUES (?,?,?,?,?,?,?,?,?)",
      batchId, req.canale(), req.codicePromo(), req.utente(), now,
      req.righe().size(), totProd, totCard, req.note());

    return new InvioResult(batchId, now, ...);
}
```

Accorgimenti Netezza:
- **Batch insert** (500–1000 righe per batch); evitare insert riga-per-riga.
- Per volumi grandi (intero piano canale) valutare `external table` / bulk load,
  ma per le griglie (centinaia di righe) il batch JDBC è sufficiente.
- Netezza preferisce **transazioni brevi**; nessun lock prolungato.

---

## 7. Modifiche al frontend (questo repo)

Le modifiche sono **contenute** perché i dati sono già isolati in `src/data/`.

1. Creare `src/api/client.js` con funzioni `fetchPromozioni`, `fetchMetrics`,
   `fetchSpazi`, `fetchAnagrafica`, `saveGriglia`, `inviaGriglia`,
   `getUltimoInvio`, usando `fetch(import.meta.env.VITE_API_BASE + …)`.
2. Sostituire gli `import` statici (`import METRICS from '../data/metrics'`) con
   caricamento async + stato (React Query consigliato per cache/loading/retry).
3. `useGridState` riceve i dataset come parametri invece di importarli, oppure
   legge dallo store di React Query. La logica budget (`buildPromoBudget`) resta
   identica: opera su `SPAZI`/`REPARTI` che ora arrivano dall'API.
4. I bottoni **Salva** / **Invia Dati** (già presenti, oggi finti) chiamano
   `saveGriglia` / `inviaGriglia`; il timestamp DWH viene da `getUltimoInvio`.
5. `VITE_API_BASE` come variabile d'ambiente di build (Pages) o stesso origin
   se il frontend viene servito dal backend.

> I file `src/data/*.js` restano utili come **fixtures** per sviluppo offline e
> per i test del motore AI.

---

## 8. Come procedere — roadmap operativa

1. **Backend skeleton**: Spring Boot 3 con due datasource (`trino`, `netezza`),
   HikariCP, profilo `local` (fixtures) + `prod` (DB reali).
2. **Driver Netezza**: caricare `nzjdbc3.jar` nel repository Maven interno
   (Nexus/Artifactory) — non è su Maven Central.
3. **Trino**: aggiungere `io.trino:trino-jdbc`; verificare catalog/schema Mosaic
   con un `SELECT 1` e poi le 4 query della sez. 4.
4. **DDL Netezza**: creare le 2 tabelle + vista (sez. 3) in ambiente di test.
5. **Endpoint READ** prima (sez. 5, GET): sbloccano subito il frontend reale.
6. **Endpoint WRITE** poi (Salva/Invia) con audit `BATCH_ID`.
7. **Frontend**: introdurre `src/api/client.js` + React Query, feature-flag per
   alternare fixtures/API.
8. **Sicurezza**: CORS sull'origin Pages, auth OIDC, segreti in Vault.
9. **Deploy backend**: container (Docker) su piattaforma interna; il frontend
   può restare su Pages (con `VITE_API_BASE` che punta al backend) oppure essere
   servito come static dal backend stesso (elimina problemi CORS).

### Domande aperte da chiarire con i referenti DWH
- Nomi reali di catalog/schema/tabelle su Mosaic (per finalizzare le query sez. 4).
- Politica di storicizzazione su Netezza: **append-only** (consigliato) vs
  upsert dell'ultimo stato.
- Identità utente: SSO aziendale? Da propagare in `UTENTE` per l'audit.
- Granularità invio: per singola promo o per intero piano canale (entrambe
  supportate dal modello: `CODICE_PROMO` nullable in `GRIGLIE_PROMO_INVII`).
