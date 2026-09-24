# Le Ceneri del Registro

PWA narrativa mobile-first: una storia malinconica su memoria, lutto e tecnologia, attraverso la quale si impara il mondo delle **blockchain** — dai blocchi e dagli hash fino a rollup, governance e trilemma.

## Avvio

```bash
cd le-ceneri-del-registro
npm start          # http://localhost:8080
```

```bash
npm test           # integrità contenuti + persistenza
npm run icons      # rigenera le icone PNG
```

## Come si gioca

| Azione | Input |
|---|---|
| Avanzare / finire il testo | Pulsante **Continua** o `Spazio` / `Invio` |
| Scegliere | Tap sulle carte |
| Minigiochi | Touch dedicati (forgia, ordine, timing, voci…) |
| Mappa / Codex | Barra superiore |

- **12 capitoli** con scelte e finali multipli (Seme, Vetro, Candela)
- **30 minigiochi** su **12 motori** diversi (hashmill, consensus, signit, timing, priority, bughunt, phishguard, quorum, merkle, governance, feedpick, chainlink)
- **12 lezioni**, **12 quiz**, **24 frammenti**, **49 termini** nel glossario, **17 successi**
- Salvataggio locale automatico, Service Worker offline, audio ambientale procedurale (Web Audio), haptic, `prefers-reduced-motion`

## Curriculum (generale → avanzato)

1. Registro distribuito e nodi · 2. Hash, blocchi, immutabilità · 3. Chiavi, firme, wallet, self-custody · 4. Peer-to-peer, liveness/safety · 5. Mempool, gas, MEV · 6. PoW, PoS, finalità, 51%, fork · 7. Smart contract, reentrancy, approvazioni · 8. Oracoli, AMM, DeFi · 9. Layer 2, rollup, Merkle, bridge · 10. DAO, quorum, Sybil · 11. Privacy, pseudonimità, zk · 12. Sicurezza e scelta finale

## Struttura

```
le-ceneri-del-registro/
├── index.html          # shell applicativa
├── styles.css          # UI mobile-first, glass, dark notturno
├── manifest.json       # PWA manifest
├── sw.js               # cache offline
├── server.mjs          # server statico zero-dipendenze
├── icons/              # PNG generati (192/512/…)
├── js/
│   ├── main.js         # flusso scena, mappa, codex, settings
│   ├── core/           # stato+save, audio, ui
│   ├── content/        # storia, lezioni, glossario, giochi, successi
│   └── game/engines.js # 12 motori di minigioco
├── tools/make-icons.mjs
└── test/run.mjs
```

## Note

- Nessuna dipendenza runtime, nessuna chiamata di rete: giocabile offline dopo il primo caricamento.
- Blockchain **simulata**: didattica, senza wallet reali né fondi.
- Licenza MIT.
