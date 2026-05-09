# Allegato tecnico — Applicazione web «Istruzioni operative interattive»

**Tipologia documento:** scheda descrittiva per Reparti IT, Sicurezza informatica, Compliance e Privacy  
**Oggetto:** caratteristiche architetturali, dipendenze di rete, identificativi di servizio e indicazioni per l’abilitazione su reti corporate  
**Ambiente di esercizio dichiarato:** Internet pubblico (HTTPS)

### Rimandi tra formati (cartella `docs/`)

| Formato | File | Uso |
|---------|------|-----|
| **Formato Note / email (digitale)** | **`DOCUMENTAZIONE-AZIENDALE-NOTE.txt`** | Testo da copiare in **Apple Note**, **messaggio email**, **Blocco note**; in testa: rimandi a PDF e allegato lungo. |
| Allegato completo (fonte editoriale) | `DOCUMENTAZIONE-AZIENDALE-IT.md` | Modifiche al testo; stesso contenuto delle versioni lunghe. |
| Consultazione digitale (link attivi) e stampa PDF | `DOCUMENTAZIONE-AZIENDALE-IT.html` | Aprire nel browser (**Edge** o **Chrome**): URL e domini sono **cliccabili**. Su Windows, se il doppio clic sul `.html` non apre nulla: eseguire **`APRI-DOCUMENTAZIONE-AZIENDALE.bat`** oppure tasto destro sul `.html` → **Apri con** → Edge. **Stampa → Salva come PDF** per un PDF con hyperlink (se il lettore lo supporta). |
| Invio ad azienda / helpdesk | `DOCUMENTAZIONE-AZIENDALE-IT.pdf` | Allegato preferito verso IT. |
| Copia gemella (stesso testo) | `DOCUMENTAZIONE-AZIENDALE-EMAIL-NOTE.txt` | Uguale a **`DOCUMENTAZIONE-AZIENDALE-NOTE.txt`** — aprire quello che preferisci. |

**Flusso consigliato:** aggiornare il `.md` → allineare `.html` → rigenerare il `.pdf` dall’html → copiare il testo da **`DOCUMENTAZIONE-AZIENDALE-NOTE.txt`** (oppure **`DOCUMENTAZIONE-AZIENDALE-EMAIL-NOTE.txt`**, stesso contenuto) e allegare il `.pdf`.

---

## Premessa

Il presente allegato illustra, in forma sintetica e tecnica, i componenti dell’applicazione web denominata «Istruzioni operative interattive», al fine di consentire ai Reparti competenti la valutazione della compatibilità con le policy di sicurezza perimetrale, di proxy e di gestione dei certificati, nonché l’eventuale configurazione di allowlist e regole di filtraggio.

**Origine applicativa (URL di produzione):**

`https://francescomendosa-create.github.io/Istruzioni-operative-interattive/`

**Microsoft Entra ID (account aziendale / SSO):** nella versione attuale dell’applicazione **non è integrato**. Non è previsto login con credenziali Microsoft dell’organizzazione; per questa versione **non si utilizzano** Tenant ID, Application (client) ID né redirect URI Azure per l’accesso utente. L’autenticazione applicativa è solo quella di cui al § 3 (Firebase, modalità anonima). Un’integrazione futura con Entra ID richiederà configurazione Azure da parte dell’azienda e aggiornamento del presente allegato.

---

## 1. Descrizione sintetica dell’applicazione

| Elemento | Specifica |
|----------|-------------|
| Classificazione | Applicazione web **statica** (HTML, CSS, JavaScript), distribuita mediante **GitHub Pages**. Non è previsto, sulla piattaforma GitHub Pages, un runtime applicativo dedicato gestito dal titolare del repository oltre alla pubblicazione di file statici. |
| Finalità funzionale | Contenuti di natura **didattica e formativa** in ambito operativo su impianti di trattamento delle acque reflue; sono incluse modalità interattive (quiz, diagnostica, animazioni). L’applicazione **non** costituisce un sistema di supervisione o controllo di processo industriale. |
| Modalità di fruizione | Accesso tramite browser conforme agli standard web; è possibile l’installazione come **Progressive Web Application (PWA)**. In ambiente Windows, un collegamento sul desktop può richiamare il browser (es. Google Chrome) in modalità applicazione dedicata tramite `chrome_proxy.exe` e identificativo `--app-id`, coerentemente con un’installazione PWA dell’origine HTTPS suddetta. |

---

## 2. Architettura logica

Il traffico si articola principalmente come segue:

```
Client browser
    │
    ├─► HTTPS → hosting GitHub Pages (documento, risorse statiche, manifest, service worker)
    │
    ├─► HTTPS → infrastruttura Google (SDK Firebase da origine gstatic; API per autenticazione e Firestore)
    │
    ├─► HTTPS → servizi di terze parti (attivazione condizionale; riferimento § 4.3)
    │
    └─► API del browser (es. sintesi vocale locale) senza endpoint di rete dedicato obbligatorio
```

Il **service worker** (`sw.js`) è impiegato per il ciclo di aggiornamento della PWA; la strategia implementata nel file corrente inoltra le richieste mediante `fetch` verso la rete, senza implementazione di una cache offline articolata lato service worker per gli asset principali.

---

## 3. Backend SaaS — progetto Firebase (Google Cloud)

L’applicazione utilizza il servizio **Firebase** con configurazione client esposta nel codice sorgente (modalità prevista per gli SDK web).

| Parametro | Valore |
|-----------|--------|
| Project ID | `istruzioni-operative` |
| Auth domain | `istruzioni-operative.firebaseapp.com` |
| Storage bucket | `istruzioni-operative.firebasestorage.app` |

**Autenticazione:** è implementata l’autenticazione anonima Firebase (`signInAnonymously`), finalizzata all’attribuzione di un identificativo tecnico (`uid`) senza credenziali nominali. **Non** è integrata autenticazione federata SAML/OIDC con Identity Provider aziendale né login **Microsoft Entra ID** (né altro SSO); gli utenti non accedono con account Microsoft dell’organizzazione.

**Firestore:** persistenza dei dati relativi alle funzionalità collaborative del quiz (esemplificativamente: classifica, presenza degli utenti connessi), secondo **regole di sicurezza** definite nella console Firebase del titolare del progetto cloud.

**Trasporto:** nel codice risulta attivato `experimentalForceLongPolling: true` per il client Firestore, con traffico **HTTPS**, al fine di migliorare la compatibilità con alcuni ambienti dotati di proxy applicativi.

---

## 4. Requisiti di connettività e destinatari di traffico

### 4.1 Origine principale

| Host | Protocollo / porta | Funzione |
|------|----------------------|----------|
| `francescomendosa-create.github.io` | HTTPS (443) | Erogazione dell’applicazione statica tramite GitHub Pages |

### 4.2 Infrastruttura Google (SDK Firebase e servizi associati)

| Host / pattern | Protocollo / porta | Funzione |
|----------------|---------------------|----------|
| `www.gstatic.com` | HTTPS (443) | Recupero degli script JavaScript del SDK Firebase (moduli compat) |
| `*.googleapis.com` | HTTPS (443) | Endpoint API tipici per Firestore, token di autenticazione, Identity Toolkit (elenco effettivo dipendente dalla versione del SDK) |
| `*.google.com` | HTTPS (443) | Risorse correlate all’ecosistema Google ove richieste dalla catena di caricamento |
| `istruzioni-operative.firebaseapp.com` | HTTPS (443) | Dominio Firebase associato al progetto |

Nel file di configurazione è presente un identificativo **Google Analytics 4** (`measurementId`: `G-TVD7CDXW9M`). Qualora il codice inizializzi effettivamente Analytics, il traffico può estendersi agli host di raccolta dati Google pertinenti. Per una verifica esaustiva in ambiente controllato, si può effettuare acquisizione del traffico di rete (strumenti di diagnostica del browser o proxy di laboratorio).

### 4.3 Servizi opzionali o condizionali (costanti nel codice sorgente)

| Servizio | Host | Condizione di utilizzo |
|----------|------|-------------------------|
| Sintesi vocale remota (Piper su Render) | `quiz-piper-tts.onrender.com` | Endpoint predefinito per richieste HTTPS verso `/tts` nelle modalità che prevedono telecronaca vocale remota |
| Google AI (Gemini) | `generativelanguage.googleapis.com` | Invocazione solo in presenza di chiave API configurata per la telecronaca basata su modello linguistico (tipicamente ambito funzionale avanzato / sviluppo) |
| Generazione immagine QR | `api.qrserver.com` | Richiesta GET per la generazione dell’immagine QR che codifica l’URL dell’applicazione dalla schermata Impostazioni |

Per le richieste verso Gemini, il payload riflette il contenuto testuale delle domande del quiz presentate nell’interfaccia utente. La decisione di autorizzare tale host deve essere correlata alla policy aziendale sul versemento di dati verso servizi di intelligenza artificiale esterni.

---

## 5. Quadro informativo per il trattamento dei dati (Privacy)

| Categoria | Ubicazione | Note operative |
|-----------|------------|------------------|
| Identificativo tecnico anonimo | Firebase Authentication | UID generato dal meccanismo di autenticazione anonima |
| Testo libero per nome visualizzato / presenza | Firestore | Immesso dall’utente finale tramite interfaccia; lunghezza soggetta a limitazione nel codice applicativo |
| Dati di gioco (es. punteggi, classifica) | Firestore | Informazioni di contesto ludico, non parametri di impianto industriale |
| Telemetria web / GA4 | Google (ove attivata) | Da correlare all’informativa privacy del titolare del sito e alla configurazione effettiva nel build distribuito |

L’applicazione non è descritta nel presente allegato come sistema di acquisizione dati di processo da impianto né come componente SCADA.

---

## 6. Gestione degli errori TLS in ambiente corporate

### 6.1 Codice `NET::ERR_CERT_AUTHORITY_INVALID` in navigazione verso `https://francescomendosa-create.github.io/...`

Tale messaggio indica che il client **non considera attendibile** la catena di certificazione presentata durante la negoziazione TLS. Le cause più ricorrenti in ambito aziendale comprendono l’ispezione TLS del proxy senza distribuzione sul postazione di lavoro delle Certification Authority di fiducia, configurazioni MDM restrittive o anomalie di sincronizzazione dell’orologio di sistema.

**Interventi di competenza infrastrutturale (estranei alla sola modifica del codice applicativo):**

1. Distribuzione sul client delle CA radice/intermedie necessarie alla validazione del certificato presentato dal proxy di ispezione.
2. Valutazione di esclusioni mirate dall’ispezione TLS o di percorsi di instradamento dedicati, ove compatibile con la policy di sicurezza.
3. Verifica dell’assenza di errori nella catena di firma e dell’allineamento temporale del sistema.

L’endpoint GitHub Pages è comunemente servito con certificati considerati validi dalle CA pubbliche standard; l’insorgenza dell’errore su rete aziendale e non su rete domestica orienta la diagnosi verso i fattori ambientali sopra elencati.

---

## 7. Protocolli e porte

| Protocollo | Porta standard | Impiego |
|------------|----------------|---------|
| HTTPS | 443 | Traffico applicativo web e API REST descritte |
| DNS | 53 | Risoluzione dei nomi di dominio (secondo policy interne) |

Non risulta dal presente allegato la necessità di protocolli quali SMB o RDP ai fini dell’utilizzo dell’applicazione web.

---

## 8. Procedure di verifica diagnostica (predisposizione ticket di escalation)

1. Ripetizione dell’accesso all’URL da rete non soggetta alle stesse policy (es. connessione alternativa conforme alla policy aziendale): esito positivo coerente con ipotesi di limitazione perimetrale o TLS inspection.
2. Registrazione degli errori rilevati tramite strumenti di diagnostica del browser (console applicativa, traccia richieste di rete) con indicazione di codici HTTP, messaggi `ERR_*` ed eventuali blocchi `CORS`.
3. Verifica comparativa tra browser aggiornati e controllo dell’eventuale interferenza di componenti aggiuntivi di sicurezza o estensioni che filtrano host `googleapis.com` o `gstatic.com`.

---

## 9. Riferimenti ai file sorgente (audit tecnico)

| Percorso relativo | Contenuto rilevante |
|-------------------|----------------------|
| `index.html` | Logica applicativa, inizializzazione Firebase, costanti di versione e build |
| `firebase-config.json` | Parametri pubblici di configurazione Firebase |
| `manifest.json` | Metadati PWA (`start_url`, `scope`) |
| `sw.js` | Service worker e indicazione di **build** per il ciclo di aggiornamento |

La coerenza tra il valore di build definito in `index.html` (`APP_BUILD`) e il commento `build:` in `sw.js` è necessaria per il corretto aggiornamento dei client che utilizzano il service worker.

---

## 10. Sintesi delle condizioni per l’abilitazione su rete aziendale

Per il funzionamento delle funzionalità principali risultano in genere necessarie:

1. Autorizzazione del traffico **HTTPS** verso `francescomendosa-create.github.io`.
2. Autorizzazione del traffico **HTTPS** verso `www.gstatic.com`, verso il dominio progetto Firebase e verso gli endpoint **Google APIs** richiesti dal SDK (`*.googleapis.com`, con affinamento possibile mediante analisi traffico).
3. Adeguamento della fiducia nei certificati sul client in presenza di proxy di ispezione TLS.
4. Estensione facoltativa dell’allowlist agli host di cui al § 4.3 qualora si richieda l’attivazione integrale delle funzionalità che dipendono da tali servizi.

---

## Chiusura

Il contenuto del presente allegato riflette la configurazione e le dipendenze riscontrabili nel codice sorgente dell’applicazione alla data di redazione. Eventuali aggiornamenti del software potranno introdurre nuovi endpoint o modificare il comportamento dei servizi integrati; per verifiche successive si raccomanda analisi del traffico di rete in ambiente controllato o revisione della documentazione tecnica aggiornata fornita dal titolare del progetto.
