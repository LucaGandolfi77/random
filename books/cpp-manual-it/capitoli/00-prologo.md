# Prologo — Perché esiste questo manuale (e perché lo stai leggendo alle 3 di notte)

**Parole:** ~950

---

Esistono solo due tipi di linguaggi: quelli di cui le persone si lamentano e quelli che nessuno usa. Bjarne Stroustrup l'ha detto, e parlava del C++, e aveva ragione, e stava anche descrivendo la propria vita: una trentina d'anni di lamentele, da parte di persone che usano il suo linguaggio ogni giorno, per scrivere tutto ciò che hai mai toccato e che carica in meno di un secondo.

Questo manuale esiste perché gli altri manuali non ti dicono la verità. Gli altri manuali ti dicono che il C++ è un linguaggio di sistema con gestione manuale della memoria e un ricco sistema di template, e poi ti mostrano una lista concatenata, e poi tu metti giù il manuale e vai a scrivere Python, e Python va bene, e dieci anni dopo sei a una conferenza e qualcuno pronuncia la parola "latenza" e senti qualcosa muoversi nel petto, e quella cosa è il C++, che ti chiama.

Questo manuale ti dice la verità, e la verità è questa: il C++ è il linguaggio di tutto ciò che conta, e tutto ciò che conta è scritto in C++, e le persone che lo scrivono si lamentano di lui costantemente, e non smetteranno mai, e non se ne andranno mai. È un matrimonio. Ti lamenti del C++ come ti lamenti di un coniuge di trent'anni: con specificità, con amore, e con la quiete conoscenza che l'alternativa è la solitudine in un appartamento più carino.

Lo stai leggendo alle 3 di notte. Lo so, perché esistono solo tre tipi di persone che leggono manuali C++: gli studenti, che li leggono perché devono; i professionisti, che li leggono perché qualcosa si è rotto; e le persone delle 3 di notte, che li leggono perché la build è fallita alle 2:47 e il messaggio d'errore era lungo quattromila righe e da qualche parte in mezzo alla quarta millesima riga, sepolto come un tesoro in una discarica, c'era il problema vero, che era un punto e virgola mancante alla riga 41 di un file chiamato `utils_old_v2_FINAL.h`, e l'hai corretto, e ha compilato, e hai sentito una cosa che nessun'altra professione ti dà: la sensazione di aver placato un dio.

Questo manuale è per tutti e tre. Comincia catchy, perché il primo giorno di C++ è il giorno in cui scrivi `cout << "Hello, World!"` e funziona e ti senti un dio. Diventa tecnico, perché il secondo giorno di C++ è il giorno in cui incontri il linker, e il linker non ti ama. E finisce nel futuro, perché il futuro del C++ è l'unico futuro dell'informatica genuinamente difficile da prevedere: il linguaggio è sopravvissuto alla morte di tutto ciò che lo circondava — i sistemi operativi, le architetture hardware, le mode, i framework — e sopravviverà alla nostra morte, e l'ultimo programma che compila, alla fine dell'universo, sarà un programma C++, e avrà un errore di template, e qualcuno, da qualche parte, nell'ultimo secondo dell'esistenza, correggerà il punto e virgola.

Ecco cosa promette questo manuale, ed ecco cosa consegna:

1. **Accuratezza.** Ogni esempio di codice di questo libro compila, con `-Wall -Wextra -Werror`, su un compilatore moderno (GCC 13+, Clang 16+ o MSVC 19.30+). Ogni citazione è reale e attribuita. Ogni affermazione sullo standard è verificata contro il documento ISO vero, o è chiaramente marcata come gag, che — in C++ — è l'unico modo di marcare un'affermazione sullo standard.
2. **Impegno.** Questo manuale è prolisso, come promesso. Il C++ è un linguaggio prolisso. I messaggi d'errore sono prolissi. Lo standard è prolisso: l'ultimo era di duemila pagine, e il comitato sta lavorando al prossimo, che sarà più lungo, e da qualche parte in quelle duemila pagine c'è una frase che dice la cosa che fa fare al tuo programma la cosa che fa alle 3 di notte, e nessuno l'ha letta, ed è ancora vera.
3. **Divertimento.** Il C++ è divertente come è divertente gli scacchi: è divertente quando stai perdendo, perché perdere a scacchi è perdere a scacchi, e perdere al C++ è un segfault, e il segfault è la cosa più onesta dell'informatica. Il segment fault non mente. Il segment fault dice: *tu, qui, questa riga, questa memoria*. Nessun altro errore dell'informatica è così onesto. Python ti dà un traceback e un alzata di spalle. Java ti dà un'eccezione e una riunione di comitato. Il C++ ti dà l'indirizzo, la riga, e il silenzio — e il silenzio è dove fai il tuo miglior lavoro.

Un'ultima cosa, prima di cominciare. Alan Perlis ha detto: "Un linguaggio che non influenza il tuo modo di pensare la programmazione non vale la pena di essere conosciuto." Il C++ influenzerà il tuo modo di pensare la programmazione. Influenzerà il tuo modo di pensare la memoria, il tempo, la differenza tra un valore e un oggetto, cosa significhi per qualcosa di esistere. Non guarderai mai più una variabile allo stesso modo. Vedrai le scatole, e saprai che le scatole mentono, e le amerai comunque.

Questo è il matrimonio. Benvenuto.

---

*Nota sulle citazioni: ogni citazione di questo manuale è reale e attribuita, tranne quelle che non lo sono, che sono marcate come gag, che — in C++ — è l'unico modo di marcare qualsiasi cosa.*
