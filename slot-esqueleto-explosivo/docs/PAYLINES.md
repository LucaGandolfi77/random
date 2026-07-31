# Esqueleto Explosivo Clone — Allegato tecnico

## 1. Griglia e linee di pagamento

Griglia **5 rulli × 3 righe** (15 celle). Cella indicizzata `riga * 5 + colonna`.

**17 linee fisse.** Le sequenze indicano la riga (0 = alta, 1 = centrale, 2 = bassa)
occupata da ogni rullo, da sinistra a destra:

```
 1. 00000        6. 12121       11. 22022       16. 02020
 2. 11111        7. 21212       12. 10001       17. 20202
 3. 22222        8. 00100       13. 12221
 4. 01010        9. 00200       14. 01210
 5. 10101       10. 22122       15. 21012
```

Equivalente in celle (riga*5+colonna):

```
 1. [0,1,2,3,4]        2. [5,6,7,8,9]         3. [10,11,12,13,14]
 4. [0,6,2,8,4]        5. [5,1,7,3,9]         6. [5,11,7,13,9]
 7. [10,6,12,8,14]     8. [0,1,7,3,4]         9. [0,1,12,3,4]
10. [10,11,7,13,14]   11. [10,11,2,13,14]    12. [5,1,2,3,9]
13. [5,11,12,13,9]    14. [0,6,12,8,4]       15. [10,6,2,8,14]
16. [0,11,2,13,4]     17. [10,1,12,3,14]
```

## 2. Tabella dei pagamenti (× puntata totale)

Vincita per linea, solo la combinazione più lunga. Combinazioni da sinistra a destra.

| Simbolo | 3× | 4× | 5× |
|---|---|---|---|
| 💀 Calavera d'Oro | 0.5 | 0.9 | 2.5 |
| 💀 Calavera Rosa | 0.4 | 0.7 | 1.4 |
| 💀 Calavera Verde | 0.3 | 0.6 | 1.2 |
| 💀 Calavera Azul | 0.3 | 0.5 | 0.9 |
| 💀 Calavera Arancia | 0.2 | 0.4 | 0.7 |
| ☠️ Explosivo Wild | — | — | — |

L'Explosivo Wild sostituisce tutti i simboli; non paga da solo.

## 3. Regole

- **Cascata**: le celle vincenti (e quelle esplose dal Wild) vengono rimosse; i simboli sopra
  cadono e nuovi simboli riempiono dall'alto. Il round prosegue finché ci sono vincite o Wild.
- **Explosivo Wild**: quando appare, esplode se stesso + gli 8 simboli circostanti (griglia
  3×3, **senza wrap-around**: un Wild sul rullo 5 non tocca il rullo 1). L'esplosione forza
  sempre una cascata, anche senza vincite di linea.
- **Mucho Multiplier**: ×1 → ×2 → ×4 → ×8 → ×16 → ×32. Sale di un livello a ogni passo della
  cascata che produce una vincita o un Wild; si azzera a fine round.
- Le vincite sono pagate al moltiplicatore attivo in quel passo (la vincita della prima
  caduta è a ×1, della prima cascata a ×2, ecc.).
- Puntate fisse: 10, 20, 50, 100, 200, 500. Vincite arrotondate all'intero.

## 4. RTP e calibrazione

**Obiettivo**: 96.0%. La matematica è calibrata tramite simulazione Monte Carlo
(`tools/simulate.js`, RNG deterministico riproducibile).

### Pesi simboli calibrazione

| Simbolo | Peso |
|---|---|
| gold | 16 |
| pink | 17 |
| green | 18 |
| blue | 19 |
| orange | 20 |
| wild | 0.481 |

### Report calibrazione (10.000.000 di spin, bet = 10)

| Metrica | Valore |
|---|---|
| **RTP misurato** | **96.09%** (± 0.006% @1σ) |
| Hit frequency (round vincenti) | 44.46% |
| Round con Wild | 8.97% |
| Cascate medie / round | 1.737 (max 16) |
| Moltiplicatore medio sui passi vincenti | ×2.107 (max ×32) |
| Vincita massima osservata | 410× puntata |

Riferimento: l'Esqueleto Explosivo originale (Thunderkick) ha RTP pubblicato tra 96.0% e
97.6% a seconda della configurazione; questo clone è calibrato su 96.0%.
