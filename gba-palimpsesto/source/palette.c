//---------------------------------------------------------------------------------
// Palimpsesto - palette
//
// Il pezzo che da' il nome al gioco. Ogni personaggio possiede una bank di
// palette OBJ, e cancellarlo significa scrivere una rampa di grigi in quella
// bank: da quel momento non lo si vede piu' a colori, e non lo vedra' piu'
// nessuno.
//
// Due scelte che vengono dal limite dell'hardware e non dalla scelta estetica:
//
// 1) Le bank OBJ 12-15 sono specchi hardware delle 0-3. Scrivere sulla 13
//    sembra funzionare e poi disegna con i colori sbagliati: per questo gli
//    indici usati vanno da 0 a PO_OBJ_MAX (11).
//
// 2) La ripartizione delle voci BG e' l'inversa di quella che sembra naturale,
//    ed e' imposta dal fatto verificato che BG0 in 8bpp si vede sempre in
//    primo piano e copre gli altri BG. Vedi vram.h per il dettaglio.
//---------------------------------------------------------------------------------
#include "pale.h"
#include <tonc_memmap.h>
#include <tonc_memdef.h>

// Colori in BGR15: i bit sono nell'ordine opposto rispetto a come si scrive un
// colore, quindi 0x001F e' rosso e 0x7C00 e' blu.
#define RGB(r, g, b) ((u16)(((r) & 31) | (((g) & 31) << 5) | (((b) & 31) << 10)))

//---------------------------------------------------------------------------------
// La carta: 16 tonalita' di pergamena, dal bianco sporco all'inchiostro secco.
//
// Non e' una gamma qualsiasi: la meta' chiara e' carta, la meta' scura e'
// inchiostro, e in mezzo c'e' la macchia. I tile del mondo campionano questa
// rampa per il dithering, che e' cio' che fa leggere la pagina come carta
// invece che come grafica.
//---------------------------------------------------------------------------------
static const u16 s_paper[16] = {
	RGB(31,30,26),   // 0  fondo carta
	RGB(27,26,22),
	RGB(23,22,18),
	RGB(19,18,15),
	RGB(15,14,12),
	RGB(11,10, 9),
	RGB( 7, 7, 6),
	RGB( 3, 3, 3),   // 7  ombra
	RGB(30,24,16),   // 8  prima macchia di caffe'
	RGB(27,19,11),
	RGB(23,15, 7),
	RGB(18,11, 4),
	RGB(14, 8, 3),
	RGB( 9, 5, 2),
	RGB( 5, 3, 1),
	RGB( 0, 0, 0)    // 15 inchiostro secco
};

//---------------------------------------------------------------------------------
// Bank dei personaggi.
//
// Ognuno ha tre colori propri e il resto inchiostro: chi e' cancellato vede
// sparire i tre e resta contorno. E' cosi' che la differenza si nota
// immediatamente in un'istantanea, senza dover leggere un testo.
//---------------------------------------------------------------------------------
static const u16 s_actor[PO_ERASED + 1][16] = {
	// PO_OTTAVA - la Cancelliera. Inchiostro e carta, con un tocco di rosso
	// sul sigillo: e' l'unica che scrive, e si vede.
	{
		RGB( 0, 0, 0), RGB( 8, 7, 6), RGB(16,15,14), RGB(24,23,21),
		RGB( 6, 5, 4), RGB(13,12,11), RGB(20,19,17), RGB(28,27,25),
		RGB( 4, 3, 3), RGB(10, 9, 8), RGB(17,16,15), RGB(25,24,22),
		RGB(31,31,31), RGB(18,10, 8), RGB(24,15,12), RGB(10, 6, 5)
	},
	// PO_BIEN - il Censore pentito. Verde acido: era nemico, il colore resta.
	{
		RGB( 0, 0, 0), RGB( 8, 8, 4), RGB(15,15, 8), RGB(23,23,12),
		RGB( 6, 6, 3), RGB(12,12, 6), RGB(19,19,10), RGB(27,27,14),
		RGB( 4, 4, 2), RGB( 9, 9, 4), RGB(16,16, 8), RGB(24,24,12),
		RGB(31,31,31), RGB(12,20,10), RGB(18,28,14), RGB( 7,11, 6)
	},
	// PO_FERRO - il Riscrittore. Rosso mattone: scrive sopra, quindi macchia.
	{
		RGB( 0, 0, 0), RGB( 9, 5, 4), RGB(17, 9, 8), RGB(26,13,11),
		RGB( 7, 4, 3), RGB(13, 7, 6), RGB(21,11, 9), RGB(29,15,13),
		RGB( 5, 3, 2), RGB(11, 6, 5), RGB(18, 9, 7), RGB(26,13,10),
		RGB(31,31,31), RGB(20,14, 4), RGB(28,20, 6), RGB(12, 8, 3)
	},
	// PO_VOCE - La Voce. Non ha una palette propria: condivide la di Ottava per
	// che' in un palinsesto due figure legate dalla stessa riga non possono
	// avere due colori. La riga resta per tenere gli indici allineati.
	{
		RGB( 0, 0, 0), RGB( 8, 7, 6), RGB(16,15,14), RGB(24,23,21),
		RGB( 6, 5, 4), RGB(13,12,11), RGB(20,19,17), RGB(28,27,25),
		RGB( 4, 3, 3), RGB(10, 9, 8), RGB(17,16,15), RGB(25,24,22),
		RGB(31,31,31), RGB(18,10, 8), RGB(24,15,12), RGB(10, 6, 5)
	},
	// PO_ENEMY - le righe. Rosso secco, piu' vicino all'inchiostro che al
	// rosso: un nemico non e' una persona, e' una frase sulla pagina.
	{
		RGB( 0, 0, 0), RGB( 9, 4, 4), RGB(17, 8, 8), RGB(25,12,12),
		RGB( 7, 3, 3), RGB(13, 6, 6), RGB(20, 9, 9), RGB(28,13,13),
		RGB( 5, 2, 2), RGB(11, 5, 5), RGB(18, 8, 8), RGB(26,12,12),
		RGB(31,31,31), RGB(24,20,16), RGB(31,28,24), RGB(14,12,10)
	},
	// PO_EFFECT - bianco puro: il flash del parry perfetto e i numeri di
	// danno devono poter essere il colore piu' brillante dello schermo.
	{
		RGB( 0, 0, 0), RGB( 6, 6, 6), RGB(12,12,12), RGB(18,18,18),
		RGB(24,24,24), RGB(28,28,28), RGB(31,31,31), RGB(31,31,31),
		RGB(31,31,31), RGB(29,29,29), RGB(26,26,26), RGB(22,22,22),
		RGB(31,31,31), RGB(31,20,20), RGB(20,31,20), RGB(20,20,31)
	},
	// PO_ERASED - cio' che resta di un cancellato. Tre gradi e basta: la
	// forma si legge, il colore no. Non si arriva al nero assoluto perche' un
	// personaggio cancellato deve restare visibile: e' il lutto del gioco, non
	// un errore di rendering.
	{
		RGB( 0, 0, 0), RGB( 6, 6, 6), RGB(12,12,12), RGB(18,18,18),
		RGB(24,24,24), RGB(22,22,22), RGB(19,19,19), RGB(16,16,16),
		RGB( 5, 5, 5), RGB(10,10,10), RGB(15,15,15), RGB(21,21,21),
		RGB(31,31,31), RGB(14,14,14), RGB(20,20,20), RGB( 8, 8, 8)
	}
};

//---------------------------------------------------------------------------------
// Palette di testo e HUD.
//
// Due voci bastano e sono tutte quelle che servono: fondo e testo. Il resto
// della bank e' spazio per i box e le icone che verranno con i dialoghi.
//
// Sono fuori dalla gamma della carta di proposito: l'interfaccia non deve
// sembrare scritta sulla pagina, altrimenti non si distingue dal mondo.
//---------------------------------------------------------------------------------
static const u16 s_hud[16] = {
	RGB( 0, 0, 0),   // 0: trasparente in 4bpp, non usata
	RGB( 0, 0, 0),   // 1: fondo dei glifi e dei box (UI_BG)
	RGB(31,31,31),   // 2: tratti del testo (UI_FG)
	RGB( 8, 8, 8),   // 3
	RGB(14,14,14),   // 4
	RGB(20,20,20),   // 5
	RGB(26,26,26),   // 6
	RGB(31,31,31),   // 7
	RGB( 8, 2, 2),   // 8  bordo scuro dei box
	RGB(18, 6, 6),   // 9  bordo
	RGB(28,10,10),   // 10 bordo chiaro
	RGB(31,16,16),   // 11 rosso: pericolo, Filo basso
	RGB(31,28,10),   // 12 giallo: attenzione
	RGB(16,28,16),   // 13 verde: cucitura
	RGB(10,18,28),   // 14 blu: Chiarezza
	RGB(31,31,31)    // 15 testo su fondi chiari
};

//---------------------------------------------------------------------------------
void pal_write_bank(volatile u16 *base, int bank, const u16 *colors)
{
	int i;

	for (i = 0; i < 16; i++)
		base[bank * 16 + i] = colors[i];
}

void pal_init(void)
{
	int i;
	volatile u16 *bg = (volatile u16 *)PAL_BG_BASE;

	// Il mondo sta su BG0 in 8bpp, quindi l'indice nel tile e' direttamente la
	// voce di palette: occupa le voci da PAL_WORLD_BASE in su, con le 16
	// tonalita' della carta. I primi 16 indici restano al testo.
	for (i = 0; i < 16; i++)
		bg[PAL_WORLD_BASE + i] = s_paper[i];

	// Testo e HUD stanno su BG1 in 4bpp, che usa la bank 0, cioe' le voci
	// 0-15. I due non si pestano: il page tint riscrive il mondo e non sfiora
	// mai l'interfaccia.
	for (i = 0; i < 16; i++)
		bg[i] = s_hud[i];

	for (i = 0; i <= PO_OBJ_MAX; i++)
		pal_write_bank((volatile u16 *)PAL_OBJ_BASE, i, s_actor[PO_ENEMY]);
}

//---------------------------------------------------------------------------------
// Una bank vuota
//
// Serve per lo slot non schierato in battaglia: se lasciassimo i colori
// dell'ultimo personaggio, lo slot vuoto sembrerebbe ancora occupato. In un
// gioco sulla cancellazione, uno slot vuoto deve sembrare vuoto.
//---------------------------------------------------------------------------------
static const u16 s_blank[16] = {
	RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0),
	RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0),
	RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0),
	RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0), RGB( 0, 0, 0)
};

void pal_bank_clear(int obj_bank)
{
	pal_write_bank((volatile u16 *)PAL_OBJ_BASE, obj_bank, s_blank);
}

//---------------------------------------------------------------------------------
static int bank_for_actor(int actor_id)
{
	switch (actor_id) {
	case ACTOR_OTTAVA: return PO_OTTAVA;
	case ACTOR_BIEN:   return PO_BIEN;
	case ACTOR_FERRO:  return PO_FERRO;
	default:           return PO_VOCE;
	}
}

//---------------------------------------------------------------------------------
void pal_actor(int actor_id)
{
	if (actor_id < 0 || actor_id >= ACTOR_MAX) return;

	pal_write_bank((volatile u16 *)PAL_OBJ_BASE, bank_for_actor(actor_id),
	               s_actor[bank_for_actor(actor_id)]);
}

//---------------------------------------------------------------------------------
// pal_erase_actor: la cancellazione.
//
// E' tutto qui: quattro righe di scrittura. Nessuna logica, nessun flag, nessun
// caso speciale nel renderer.
//
// Il motivo di questa semplicita' e' che la cancellazione non e' un evento
// della battaglia a cui si reagisce: e' una riga che sparisce dalla pagina. Se
// servisse codice per cambiarla, prima o poi qualcuno dimenticherebbe di
// chiamarlo e il gioco mostrerebbe un personaggio cancellato ancora a colori,
// che e' l'unico errore che in questo gioco non si puo' fare.
//---------------------------------------------------------------------------------
void pal_erase_actor(int actor_id)
{
	if (actor_id < 0 || actor_id >= ACTOR_MAX) return;

	// La bank resta quella del personaggio: solo i colori cambiano. Cosi' gli
	// sprite che usano quella bank diventano grigi senza dover cambiare
	// l'attributo OAM, e il cancellato resta sullo stesso tile degli altri.
	pal_write_bank((volatile u16 *)PAL_OBJ_BASE, bank_for_actor(actor_id),
	               s_actor[PO_ERASED]);
}

//---------------------------------------------------------------------------------
// pal_page_tint: la pagina si sbiadisce.
//
// Ogni volta che una riga viene cancellata, il mondo perde un gradino di
// saturazione. Non e' un filtro applicato a schermo: si riscrive la bank 0,
// quindi il dithering dei tile comincia a cadere su colori diversi e il
// risultato e' quello di una pagina sbiadita davvero.
//
// Il chiamante passa level da 0 (intatta) a PAGE_TINT_MAX (spenta). Mescola
// verso il grigio tenendo separati i due estremi della rampa: schiacciare
// tutto sul grigio medio farebbe sparire la carta insieme all'inchiostro, e
// il mondo diventerebbe indistinguibile da un errore di rendering.
//---------------------------------------------------------------------------------
#define PAGE_TINT_MAX  6

static u8 s_tint_level;

int pal_tint_level(void)
{
	return s_tint_level;
}

void pal_page_tint(int level)
{
	volatile u16 *bg = (volatile u16 *)PAL_BG_BASE;
	int i, mix;

	if (level < 0) level = 0;
	if (level > PAGE_TINT_MAX) level = PAGE_TINT_MAX;
	s_tint_level = (u8)level;

	mix = level * 3;   // 0..18, quanto verso il grigio
	if (mix > 18) mix = 18;

	// Solo gli indici del mondo: quelli del testo non si toccano mai.
	for (i = 0; i < 16; i++) {
		u16 c = s_paper[i];
		int r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31;
		int lum = (r + g + b) / 3;

		// Mescola verso il grigio di uguale luminosita': la carta resta
		// carta, solo piu' spenta.
		r = r + ((lum - r) * mix) / 18;
		g = g + ((lum - g) * mix) / 18;
		b = b + ((lum - b) * mix) / 18;

		bg[PAL_WORLD_BASE + i] = RGB(r, g, b);
	}
}