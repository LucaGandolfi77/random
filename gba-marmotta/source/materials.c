//---------------------------------------------------------------------------------
// Marmotta - materiali dei blocchi
//---------------------------------------------------------------------------------
#include "marmotta.h"

const Material g_mat[MAT_COUNT] = {
	//           nome    densita'    attrito     hp  colore     bordo  schegge  punti
	[MAT_WOOD]  = { "legno",  FXC(55, 100),  FXC(62, 100),
	                FX(26), C_WOOD,  C_WOOD_DK,  5, 30 },
	[MAT_STONE] = { "pietra", FXC(160, 100), FXC(70, 100),
	                FX(74), C_STONE, C_STONE_DK, 4, 55 },
	[MAT_GLASS] = { "vetro",  FXC(40, 100),  FXC(42, 100),
	                FX(10), C_GLASS, C_GLASS_DK, 7, 15 },
};

//---------------------------------------------------------------------------------
// Grandezze ausiliarie.
//---------------------------------------------------------------------------------
fx fx_len(fx x, fx y)
{
	return fx_sqrt(fx_mul(x, x) + fx_mul(y, y));
}

fx fx_hypot(fx x, fx y)
{
	return fx_len(x, y);
}
