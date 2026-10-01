//---------------------------------------------------------------------------------
// Marmotta - resa in Mode 4 (bitmap 8bpp palettizzato)
//
// Solo header libtonc qui: includere anche gba_video.h farebbe entrare in
// conflitto le macro dei registri, che libgba e libtonc definiscono allo
// stesso modo ma con nomi diversi.
//---------------------------------------------------------------------------------
#include "marmotta.h"
#include <tonc_memmap.h>
#include <tonc_memdef.h>
#include <string.h>

#define M4_PAGE0 ((u8*)MEM_VRAM)
#define M4_PAGE1 ((u8*)(MEM_VRAM + 0xA000))

#define BIG  FX(30000)
#define EPS FX_ONE / 512

static u8 *s_back;
static u8  s_page;

// Formato BGR15: bit 0-4 rosso, 5-9 verde, 10-14 blu. Attenzione, l'ordine e'
// inverso rispetto a come si scrive un colore RGB, quindi scrivere 0x001F
// dà rosso e 0x7C00 dà blu.
#define RGB(r, g, b) ((u16)(((r) & 31) | (((g) & 31) << 5) | (((b) & 31) << 10)))

static const u16 s_pal_data[C_PAL_COUNT] = {
	[C_SKY_0]    = RGB( 4,  6, 14),
	[C_SKY_1]    = RGB( 5,  9, 19),
	[C_SKY_2]    = RGB( 6, 13, 23),
	[C_SKY_3]    = RGB( 7, 16, 25),
	[C_SKY_4]    = RGB( 8, 19, 26),
	[C_SKY_5]    = RGB(10, 22, 27),
	[C_GRASS]    = RGB( 6, 20,  7),
	[C_GRASS_DK] = RGB( 3, 12,  4),
	[C_DIRT]     = RGB(11,  6,  3),
	[C_ROCK]     = RGB( 9,  9,  8),
	[C_WOOD]     = RGB(17,  9,  4),   // marrone
	[C_WOOD_DK]  = RGB(11,  5,  2),
	[C_STONE]    = RGB(15, 15, 14),   // grigio chiaro
	[C_STONE_DK] = RGB( 9,  9,  8),
	[C_GLASS]    = RGB(10, 22, 24),   // azzurro chiaro
	[C_GLASS_DK] = RGB( 5, 13, 15),
	[C_SLING]    = RGB( 5,  4,  4),
	[C_BAND]     = RGB(14,  6,  6),   // cuoio
	[C_BALL]     = RGB(14,  9,  4),   // marrone scuro
	[C_TRAIL]    = RGB(22, 22, 18),
	[C_HUD_BG]   = RGB( 2,  3,  8),
	[C_HUD_FG]   = RGB(20, 21, 31),
	[C_TEXT]     = RGB(31, 31, 31),   // bianco
	[C_SHADOW]   = RGB( 4,  4,  2),
	[C_FIRE]     = RGB(31, 16,  2),   // arancione
	[C_SMOKE]    = RGB(13, 12, 11),
	[C_WHITE]    = RGB(31, 31, 31),
	[C_BLACK]    = RGB( 0,  0,  0),
};

void gfx_init(void)
{
	int i;

	for(i = 0; i < C_PAL_COUNT; i++) {
		pal_bg_mem[i] = s_pal_data[i];
	}

	// Impostiamo il registro per intero invece di leggere e mascherare: il BIOS
	// accende il bit 7 all'avvio (modalita' "1D object" del CGB) e in mGBA quel
	// bit reinterpretato lascia lo schermo interamente bianco.
	REG_DISPCNT = DCNT_MODE4 | DCNT_BG2;

	s_page = 0;
	s_back = M4_PAGE1;
}

void gfx_clear(u8 idx)
{
	memset(s_back, idx, SCREEN_W * SCREEN_H);
}

void gfx_flip(void)
{
	REG_DISPCNT ^= 0x0010;
	s_page ^= 1;
	s_back = s_page ? M4_PAGE0 : M4_PAGE1;
}

//---------------------------------------------------------------------------------
// Primitive
//---------------------------------------------------------------------------------
void gfx_plot(int x, int y, u8 idx)
{
	if((u32)x >= (u32)SCREEN_W || (u32)y >= (u32)SCREEN_H) return;
	s_back[y * SCREEN_W + x] = idx;
}

void gfx_hline(int x1, int y, int x2, u8 idx)
{
	u8 *row;
	int x;

	if((u32)y >= (u32)SCREEN_H) return;
	if(x1 > x2) { int t = x1; x1 = x2; x2 = t; }
	if(x1 < 0) x1 = 0;
	if(x2 >= SCREEN_W) x2 = SCREEN_W - 1;
	if(x1 > x2) return;

	row = &s_back[y * SCREEN_W];

	// Allineati a 16 bit scriviamo a coppie: molto piu' veloce su VRAM.
	if(x1 & 1) row[x1++] = idx;
	{
		s16 v = (s16)(idx | (idx << 8));
		for(x = x1; x <= x2 - 1; x += 2) {
			*(vu16*)&row[x] = v;
		}
	}
	for(; x <= x2; x++) row[x] = idx;
}

void gfx_vline(int x, int y1, int y2, u8 idx)
{
	int y;

	if((u32)x >= (u32)SCREEN_W) return;
	if(y1 > y2) { int t = y1; y1 = y2; y2 = t; }
	if(y1 < 0) y1 = 0;
	if(y2 >= SCREEN_H) y2 = SCREEN_H - 1;

	for(y = y1; y <= y2; y++) s_back[y * SCREEN_W + x] = idx;
}

void gfx_rect(int x, int y, int w, int h, u8 idx)
{
	int i;

	if(w <= 0 || h <= 0) return;
	for(i = 0; i < h; i++) gfx_hline(x, y + i, x + w - 1, idx);
}

void gfx_frame(int x, int y, int w, int h, u8 idx)
{
	if(w <= 0 || h <= 0) return;
	gfx_hline(x, y, x + w - 1, idx);
	gfx_hline(x, y + h - 1, x + w - 1, idx);
	gfx_vline(x, y, y + h - 1, idx);
	gfx_vline(x + w - 1, y, y + h - 1, idx);
}

void gfx_line(int x1, int y1, int x2, int y2, u8 idx)
{
	int dx = x2 - x1, dy = y2 - y1;
	int sx, sy, err;

	if(dx == 0 && dy == 0) { gfx_plot(x1, y1, idx); return; }

	sx = dx < 0 ? -1 : 1;
	sy = dy < 0 ? -1 : 1;
	dx = dx < 0 ? -dx : dx;
	dy = dy < 0 ? -dy : dy;
	err = dx - dy;

	for(;;) {
		gfx_plot(x1, y1, idx);
		if(x1 == x2 && y1 == y2) break;
		if(err * 2 >= dy) { err -= dy; x1 += sx; }
		if(err * 2 <= dx) { err += dx; y1 += sy; }
	}
}

void gfx_disc(int cx, int cy, int r, u8 idx)
{
	int dy, dx, x0, x1;

	if(r <= 0) { gfx_plot(cx, cy, idx); return; }

	for(dy = -r; dy <= r; dy++) {
		int y = cy + dy;
		if((u32)y >= (u32)SCREEN_H) continue;
		for(dx = 0; dx < r; dx++) {
			if((dx + 1) * (dx + 1) + dy * dy > r * r) break;
		}
		x0 = cx - dx;
		x1 = cx + dx;
		if(x1 < 0 || x0 >= SCREEN_W) continue;
		if(x0 < 0) x0 = 0;
		if(x1 >= SCREEN_W) x1 = SCREEN_W - 1;
		gfx_hline(x0, y, x1, idx);
	}
}

void gfx_circle(int cx, int cy, int r, u8 idx)
{
	int x = r, y = 0, err = 1 - r;

	if(r <= 0) { gfx_plot(cx, cy, idx); return; }

	while(x >= y) {
		gfx_plot(cx + x, cy + y, idx);
		gfx_plot(cx + y, cy + x, idx);
		gfx_plot(cx - y, cy + x, idx);
		gfx_plot(cx - x, cy + y, idx);
		gfx_plot(cx - x, cy - y, idx);
		gfx_plot(cx - y, cy - x, idx);
		gfx_plot(cx + y, cy - x, idx);
		gfx_plot(cx + x, cy - y, idx);
		y++;
		if(err < 0) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * (y - x) + 1;
		}
	}
}

// Gradiente verticale. In Mode 4 l'indice di palette non e' un colore, quindi
// non si puo' interpolare fra due voci qualsiasi: servono voci consecutive
// nella tabella. Per questo il cielo occupa un blocco di SKY_STEPS indici
// consecutivi e la funzione cammina su quelli.
void gfx_gradient_v(int y0, int y1, u8 top, u8 bot)
{
	int y, span = y1 - y0;
	int steps = bot - top;

	if(span <= 0 || steps <= 0) return;
	for(y = y0; y <= y1; y++) {
		gfx_hline(0, y, SCREEN_W - 1, (u8)(top + steps * (y - y0) / span));
	}
}

//---------------------------------------------------------------------------------
// OBB rasterizzata.
//
// Un punto (px,py) e' dentro al corpo se nel sistema locale del corpo
//     lx =  dx*ca + dy*sa   soddisfa |lx| <= hx
//     ly = -dx*sa + dy*ca   soddisfa |ly| <= hy
// dove dx = px - cx e dy = py - cy. Ogni vincolo e' un intervallo su dx, quindi
// per ogni riga (dy fissato) basta intersecare i due intervalli.
//---------------------------------------------------------------------------------
static void obb_span(fx dy, fx ca, fx sa, fx hx, fx hy, fx *out_lo, fx *out_hi)
{
	// Parti da un intervallo vuoto: se la riga e' fuori dal corpo usciamo
	// subito e il chiamante trova lo > hi senza leggere nulla.
	fx lo = BIG, hi = -BIG;
	fx p = fx_mul(dy, ca);   // termine noto del vincolo su ly
	fx q = fx_mul(dy, sa);   // termine noto del vincolo su lx
	fx a, c;

	// |ly| <= hy  con  ly = -dx*sa + p
	if(fx_abs(sa) > EPS) {
		a = fx_div(p - hy, sa);
		c = fx_div(p + hy, sa);
		if(a > c) { fx t = a; a = c; c = t; }
		if(a > lo) lo = a;
		if(c < hi) hi = c;
	} else if(p < -hy || p > hy) {
		return;  // riga fuori dal corpo
	}

	// |lx| <= hx  con  lx = dx*ca + q
	if(fx_abs(ca) > EPS) {
		a = fx_div(-hx - q, ca);
		c = fx_div( hx - q, ca);
		if(a > c) { fx t = a; a = c; c = t; }
		if(a > lo) lo = a;
		if(c < hi) hi = c;
	} else if(q < -hx || q > hx) {
		return;
	}

	if(lo > hi) { *out_lo = BIG; *out_hi = -BIG; return; }

	*out_lo = lo;
	*out_hi = hi;
}

void gfx_obb(const Body *b, int ox, int oy)
{
	fx ca = fx_cos(b->angle), sa = fx_sin(b->angle);
	fx hx = b->hw, hy = b->hh;
	fx cx = b->x - fx_int(ox), cy = b->y - fx_int(oy);
	fx reach;
	int y, ymin, ymax;

	if(b->type == BT_BALL) {
		gfx_disc(fx_floor(cx), fx_floor(cy), (int)fx_floor(b->radius),
			b->color);
		gfx_circle(fx_floor(cx), fx_floor(cy), (int)fx_floor(b->radius),
			b->edge);
		return;
	}

	// Righe verticali entro cui il corpo puo' arrivare.
	reach = fx_mul(hx, fx_abs(sa)) + fx_mul(hy, fx_abs(ca));
	ymin = fx_floor(cy - reach);
	ymax = fx_floor(cy + reach);

	for(y = ymin; y <= ymax; y++) {
		fx dy = fx_int(y) + FX_HALF - cy;
		fx lo, hi;
		int x0, x1;

		obb_span(dy, ca, sa, hx, hy, &lo, &hi);
		if(lo > hi) continue;

		// fx_floor arrotonda verso -infinito, esattamente quello che serve
		// per non perdere il pixel al bordo sinistro.
		x0 = clampi(fx_floor(cx + lo), 0, SCREEN_W - 1);
		x1 = clampi(fx_floor(cx + hi), 0, SCREEN_W - 1);
		if(x1 < x0) continue;

		gfx_hline(x0, y, x1, b->color);
	}

	// Contorno: i quattro spigoli ruotati.
	{
		fx ux = fx_mul(ca, hx), uy = fx_mul(sa, hx);
		fx vx = fx_mul(-sa, hy), vy = fx_mul(ca, hy);
		fx sx[4], sy[4];

		sx[0] = cx - ux - vx; sy[0] = cy - uy - vy;
		sx[1] = cx + ux - vx; sy[1] = cy + uy - vy;
		sx[2] = cx + ux + vx; sy[2] = cy + uy + vy;
		sx[3] = cx - ux + vx; sy[3] = cy - uy + vy;

		gfx_line(fx_floor(sx[0]), fx_floor(sy[0]),
			fx_floor(sx[1]), fx_floor(sy[1]), b->edge);
		gfx_line(fx_floor(sx[1]), fx_floor(sy[1]),
			fx_floor(sx[2]), fx_floor(sy[2]), b->edge);
		gfx_line(fx_floor(sx[2]), fx_floor(sy[2]),
			fx_floor(sx[3]), fx_floor(sy[3]), b->edge);
		gfx_line(fx_floor(sx[3]), fx_floor(sy[3]),
			fx_floor(sx[0]), fx_floor(sy[0]), b->edge);
	}
}

void gfx_obb_shadow(const Body *b, int ox, int oy)
{
	int cx, cy, w, i;

	if(b->type != BT_BLOCK) return;

	cx = fx_floor(b->x - fx_int(ox));
	cy = fx_floor(b->y - fx_int(oy)) + fx_floor(b->hh) + 4;
	w  = fx_floor(fx_mul(b->hw, fx_int(18) / 10));
	if(w < 4) w = 4;
	if(w > 44) w = 44;

	for(i = 0; i < 3; i++) {
		gfx_hline(cx - w / 2 + i, cy + i, cx + w / 2 - i, C_SHADOW);
	}
}

//---------------------------------------------------------------------------------
// Font 5x7 in tabella piatta: 95 glifi x 7 righe, 5 pixel per riga.
//---------------------------------------------------------------------------------
#include "font8x8.h"

void gfx_text(int x, int y, const char *s, u8 idx)
{
	int col = 0, bit, row;

	if(!s) return;

	for(; *s; s++, col += 6) {
		const u8 *g = gfx_font_glyph(*s);

		for(row = 0; row < 7; row++) {
			u8 bits = g[row];
			for(bit = 0; bit < 5; bit++) {
				if(bits & (0x10 >> bit)) {
					gfx_plot(x + col + bit, y + row, idx);
				}
			}
		}
	}
}
