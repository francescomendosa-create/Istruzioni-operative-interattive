# Istruzioni operative interattive

Applicazione web/PWA per la consultazione interattiva di istruzioni operative,
schede di controllo, quiz, test di verifica, diagnostica e supporto tecnico.

Il progetto include funzioni per:

- consultare procedure operative per Chimico-Fisico e Biologico MBBR;
- gestire quiz e test di verifica;
- inviare test agli utenti e raccogliere risultati;
- archiviare verifiche e generare documenti stampabili;
- cercare supporto operativo tramite ricerca locale intelligente;
- sincronizzare dati e impostazioni tramite Firebase/Firestore.

### Firestore (sync multi-dispositivo)

Per schede personalizzate e testi modificati in **Modifica contenuti**, in Console Firebase → Firestore → Regole aggiungi (oltre alle collezioni già usate dal quiz):

```
match /quiz_custom_schedario/{docId} {
  allow read, create, update: if request.auth != null;
}
match /quiz_modify_overrides/{docId} {
  allow read, create, update: if request.auth != null;
}
match /quiz_checklists/{docId} {
  allow read, create, update: if request.auth != null;
}
```

Abilita anche **Authentication → Accesso anonimo**. Ogni client deve caricare `firebase-config.json` dalla stessa cartella di `index.html`.

## Versione

Versione applicazione: 2.1

## Autore

Copyright (c) 2026 Francesco Mellea.

## Licenza

Questo software e' proprietario. Tutti i diritti sono riservati.

Vedere il file `LICENSE` per i dettagli.

## Note

La repository contiene il codice sorgente dell'applicazione e le risorse
necessarie al suo funzionamento come web app/PWA.
