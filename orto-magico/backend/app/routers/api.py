from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
from .. import catalog, engine, achievements
from .. import db

router = APIRouter()

TEST_USER = "giardiniere"

class PlantReq(BaseModel):
    seed: str
class SeedBuyReq(BaseModel):
    seed: str
    qty: int = 1
class SetSelected(BaseModel):
    seed: str

async def get_user(db_, username=TEST_USER):
    cur = await db_.execute("SELECT * FROM users WHERE username=?", (username,))
    return await cur.fetchone()

async def get_plots(db_, uid):
    cur = await db_.execute("SELECT * FROM plots WHERE user_id=? ORDER BY idx ASC", (uid,))
    return [dict(r) for r in await cur.fetchall()]

async def get_inventory(db_, uid):
    cur = await db_.execute("SELECT seed, qty FROM inventory WHERE user_id=?", (uid,))
    rows = await cur.fetchall()
    return {r["seed"]: r["qty"] for r in rows}

async def get_collection(db_, uid):
    cur = await db_.execute("SELECT seed, count, first_at FROM collection_log WHERE user_id=?", (uid,))
    return [dict(r) for r in await cur.fetchall()]

async def get_ach_rows(db_, uid):
    cur = await db_.execute("SELECT ach_id, progress, claimed FROM achievements WHERE user_id=?", (uid,))
    rows = await cur.fetchall()
    out = {r["ach_id"]: {"progress": r["progress"], "claimed": r["claimed"]} for r in rows}
    return out

async def sync_plots(db_, uid):
    plots = await get_plots(db_, uid)
    changed = False
    for p in plots:
        if p["seed"]:
            before = (p["grown_seconds"], p["water"], p["last_tick"])
            engine.tick(p)
            if (p["grown_seconds"], p["water"], p["last_tick"]) != before:
                await db_.execute(
                    "UPDATE plots SET grown_seconds=?, water=?, last_tick=? WHERE id=?",
                    (p["grown_seconds"], p["water"], p["last_tick"], p["id"]),
                )
                changed = True
    if changed:
        await db_.commit()
    return plots

def xp_for_level(level):
    return int(100 * (level ** 1.5))

def compute_level(xp):
    lvl = 1
    while xp >= xp_for_level(lvl):
        xp -= xp_for_level(lvl)
        lvl += 1
    return lvl, xp, xp_for_level(lvl)

async def progress_ach(db_, uid, metric, value=1, extra=None):
    for ach in achievements.ACHIEVEMENTS:
        if ach["metric"] != metric:
            continue
        if metric == "harvest_seed" and ach.get("metric_seed") != extra:
            continue
        new_prog = value
        cur = await db_.execute("SELECT progress, claimed FROM achievements WHERE user_id=? AND ach_id=?", (uid, ach["id"]))
        row = await cur.fetchone()
        if row is None:
            await db_.execute(
                "INSERT INTO achievements(user_id, ach_id, progress, claimed) VALUES(?,?,?,0)",
                (uid, ach["id"], new_prog),
            )
        else:
            if metric in ("plots_owned", "collection_size"):
                new_prog = value
            else:
                new_prog = row["progress"] + value
            await db_.execute(
                "UPDATE achievements SET progress=? WHERE user_id=? AND ach_id=?",
                (new_prog, uid, ach["id"]),
            )
    await db_.commit()

def build_state(user, plots, inv, coll, ach_rows):
    lvl, cur_xp, next_xp = compute_level(user["xp"])
    plot_objs = []
    for p in plots:
        seed = catalog.SEEDS.get(p["seed"]) if p["seed"] else None
        status, gt, gs = engine.status_of(p, seed)
        plot_objs.append({
            "id": p["id"],
            "idx": p["idx"],
            "seed": p["seed"],
            "status": status,
            "growth_total": gt,
            "grown": gs,
            "water": p["water"],
            "fertilized": bool(p["fertilized"]),
            "emoji": seed["emoji"] if seed else "\U0001F7E9",
            "name": seed["name"] if seed else None,
            "color": seed["color"] if seed else None,
            "tree": seed.get("tree", False) if seed else False,
        })
    seeds = []
    for k, s in catalog.SEEDS.items():
        seeds.append({
            "key": k, "name": s["name"], "emoji": s["emoji"], "cost": s["cost"],
            "sell": s["sell"], "growth": s["growth"], "lvl": s["lvl"], "tree": s.get("tree", False),
            "seasonal": s.get("seasonal"), "kind": s.get("kind"), "color": s["color"],
            "shop": s.get("shop", ""), "owned": inv.get(k, 0),
            "unlocked": lvl >= s["lvl"],
        })
    coll_set = {c["seed"] for c in coll}
    ach_objs = []
    for a in achievements.ACHIEVEMENTS:
        r = ach_rows.get(a["id"], {"progress": 0, "claimed": 0})
        ach_objs.append({
            "id": a["id"], "name": a["name"], "emoji": a["emoji"], "desc": a["desc"],
            "goal": a["goal"], "progress": r["progress"], "claimed": bool(r["claimed"]),
            "reward_coins": a["reward_coins"], "reward_gems": a["reward_gems"],
            "final": a.get("final", False),
        })
    return {
        "user": {
            "username": user["username"], "coins": user["coins"], "gems": user["gems"],
            "level": lvl, "xp": cur_xp, "xp_next": next_xp, "is_test": bool(user["is_test"]),
            "selected_seed": user["selected_seed"],
        },
        "plots": plot_objs,
        "max_plots": len(catalog.PLOT_COSTS) + catalog.INITIAL_PLOTS,
        "next_plot_cost": (catalog.PLOT_COSTS[max(0, len(plots) - catalog.INITIAL_PLOTS)]
                           if len(plots) - catalog.INITIAL_PLOTS < len(catalog.PLOT_COSTS) else None),
        "seeds": seeds,
        "collection": [{"key": c["seed"], "count": c["count"],
                        "name": catalog.SEEDS[c["seed"]]["name"] if c["seed"] in catalog.SEEDS else c["seed"],
                        "emoji": catalog.SEEDS[c["seed"]]["emoji"] if c["seed"] in catalog.SEEDS else "\u2753"}
                       for c in coll],
        "achievements": ach_objs,
        "collection_known": len(coll_set),
        "collection_total": len(catalog.SEEDS),
    }

@router.get("/state")
async def state():
    async with db.get_conn() as db_:
        user = await get_user(db_)
        plots = await sync_plots(db_, user["id"])
        inv = await get_inventory(db_, user["id"])
        coll = await get_collection(db_, user["id"])
        ach_rows = await get_ach_rows(db_, user["id"])
        return build_state(user, plots, inv, coll, ach_rows)

async def _refresh_after(db_, uid):
    user = await get_user(db_)
    plots = await get_plots(db_, uid)
    inv = await get_inventory(db_, uid)
    coll = await get_collection(db_, uid)
    ach_rows = await get_ach_rows(db_, uid)
    return build_state(user, plots, inv, coll, ach_rows)

@router.post("/plots/buy")
async def buy_plot():
    async with db.get_conn() as db_:
        user = await get_user(db_)
        plots = await get_plots(db_, user["id"])
        owned = len(plots)
        idx_in_costs = owned - catalog.INITIAL_PLOTS
        if idx_in_costs < 0 or idx_in_costs >= len(catalog.PLOT_COSTS):
            raise HTTPException(400, "Hai raggiunto il limite di campi!")
        cost = catalog.PLOT_COSTS[idx_in_costs]
        if user["coins"] < cost:
            raise HTTPException(400, f"Monete insufficienti. Servono {cost}.")
        new_idx = owned
        await db_.execute("UPDATE users SET coins=coins-? WHERE id=?", (cost, user["id"]))
        await db_.execute("INSERT INTO plots(user_id, idx, seed, water) VALUES(?,?,NULL,100)",
                          (user["id"], new_idx))
        await progress_ach(db_, user["id"], "plots_owned", owned + 1)
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/plant")
async def plant(idx: int, req: PlantReq):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        if req.seed not in catalog.SEEDS:
            raise HTTPException(400, "Seme inesistente.")
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        if plot["seed"] is not None:
            raise HTTPException(400, "Campo occupato! Raccogli prima.")
        cur = await db_.execute("SELECT qty FROM inventory WHERE user_id=? AND seed=?", (user["id"], req.seed))
        invrow = await cur.fetchone()
        qty = invrow["qty"] if invrow else 0
        if qty <= 0:
            raise HTTPException(400, "Non hai semi di questo tipo.")
        now = time.time()
        await db_.execute("UPDATE inventory SET qty=qty-1 WHERE user_id=? AND seed=?", (user["id"], req.seed))
        await db_.execute(
            "UPDATE plots SET seed=?, planted_at=?, grown_seconds=0, last_tick=?, water=100, fertilized=0 WHERE id=?",
            (req.seed, now, now, plot["id"]),
        )
        await progress_ach(db_, user["id"], "plants", 1)
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/water")
async def water(idx: int):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        if plot["seed"] is None:
            raise HTTPException(400, "Niente da annaffiare.")
        engine.tick(plot)
        await db_.execute("UPDATE plots SET water=100, grown_seconds=?, last_tick=? WHERE id=?",
                          (plot["grown_seconds"], time.time(), plot["id"]))
        await progress_ach(db_, user["id"], "waters", 1)
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/fertilize")
async def fertilize(idx: int):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        if plot["seed"] is None:
            raise HTTPException(400, "Niente da fertilizzare.")
        if plot["fertilized"]:
            raise HTTPException(400, "Gi\u00E0 fertilizzato.")
        if user["coins"] < 100:
            raise HTTPException(400, "Servono 100 monete per il fertilizzante.")
        engine.tick(plot)
        await db_.execute("UPDATE users SET coins=coins-100 WHERE id=?", (user["id"],))
        await db_.execute("UPDATE plots SET fertilized=1, grown_seconds=?, last_tick=? WHERE id=?",
                          (plot["grown_seconds"], time.time(), plot["id"]))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/speedup")
async def speedup(idx: int):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        if plot["seed"] is None:
            raise HTTPException(400, "Campo vuoto.")
        seed = catalog.SEEDS[plot["seed"]]
        engine.tick(plot)
        cost = engine.speedup_gems()(plot)
        if cost <= 0:
            raise HTTPException(400, "Gi\u00E0 pronta!")
        if user["gems"] < cost:
            raise HTTPException(400, f"Servono {cost} gemme.")
        await db_.execute("UPDATE users SET gems=gems-? WHERE id=?", (cost, user["id"]))
        await db_.execute("UPDATE plots SET grown_seconds=?, last_tick=? WHERE id=?",
                          (seed["growth"], time.time(), plot["id"]))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/harvest")
async def harvest(idx: int):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        if plot["seed"] is None:
            raise HTTPException(400, "Niente da raccogliere.")
        seed = catalog.SEEDS[plot["seed"]]
        engine.tick(plot)
        if plot["grown_seconds"] < seed["growth"]:
            raise HTTPException(400, "Non \u00E8 ancora pronta!")
        coins = seed["sell"]
        xp_gain = int(seed["growth"] / 60 + 5)
        is_tree = seed.get("tree", False)
        await db_.execute("UPDATE users SET coins=coins+?, xp=xp+? WHERE id=?", (coins, xp_gain, user["id"]))
        if not is_tree:
            await db_.execute("UPDATE plots SET seed=NULL, planted_at=NULL, grown_seconds=0, last_tick=NULL, fertilized=0 WHERE id=?", (plot["id"],))
        else:
            await db_.execute("UPDATE plots SET grown_seconds=0, last_tick=?, fertilized=0 WHERE id=?", (time.time(), plot["id"]))
        cur = await db_.execute("SELECT count, first_at FROM collection_log WHERE user_id=? AND seed=?", (user["id"], plot["seed"]))
        crow = await cur.fetchone()
        if crow is None:
            await db_.execute("INSERT INTO collection_log(user_id, seed, count, first_at) VALUES(?,?,1,?)",
                              (user["id"], plot["seed"], time.time()))
        else:
            await db_.execute("UPDATE collection_log SET count=count+1 WHERE user_id=? AND seed=?", (user["id"], plot["seed"]))
        await progress_ach(db_, user["id"], "harvests", 1)
        await progress_ach(db_, user["id"], "harvest_seed", 1, extra=plot["seed"])
        coll = await get_collection(db_, user["id"])
        await progress_ach(db_, user["id"], "collection_size", len(coll))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/plots/{idx}/clear")
async def clear_plot(idx: int):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        cur = await db_.execute("SELECT * FROM plots WHERE user_id=? AND idx=?", (user["id"], idx))
        plot = await cur.fetchone()
        if not plot:
            raise HTTPException(404, "Campo non esiste.")
        plot = dict(plot)
        engine.tick(plot)
        if plot["seed"] and plot["grown_seconds"] >= catalog.SEEDS[plot["seed"]]["growth"]:
            raise HTTPException(400, "E' pronta! Raccogli, non sprecare.")
        await db_.execute("UPDATE plots SET seed=NULL, planted_at=NULL, grown_seconds=0, last_tick=NULL, fertilized=0 WHERE id=?", (plot["id"],))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/seeds/buy")
async def buy_seed(req: SeedBuyReq):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        if req.seed not in catalog.SEEDS:
            raise HTTPException(400, "Seme inesistente.")
        seed = catalog.SEEDS[req.seed]
        lvl, _, _ = compute_level(user["xp"])
        if lvl < seed["lvl"]:
            raise HTTPException(400, f"Devi essere livello {seed['lvl']} per questo seme.")
        total = seed["cost"] * req.qty
        if user["coins"] < total:
            raise HTTPException(400, f"Servono {total} monete.")
        cur = await db_.execute("SELECT qty FROM inventory WHERE user_id=? AND seed=?", (user["id"], req.seed))
        row = await cur.fetchone()
        if row is None:
            await db_.execute("INSERT INTO inventory(user_id, seed, qty) VALUES(?,?,?)",
                              (user["id"], req.seed, req.qty))
        else:
            await db_.execute("UPDATE inventory SET qty=qty+? WHERE user_id=? AND seed=?", (req.qty, user["id"], req.seed))
        await db_.execute("UPDATE users SET coins=coins-? WHERE id=?", (total, user["id"]))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/selected")
async def set_selected(req: SetSelected):
    async with db.get_conn() as db_:
        if req.seed not in catalog.SEEDS:
            raise HTTPException(400, "Seme inesistente.")
        user = await get_user(db_)
        await db_.execute("UPDATE users SET selected_seed=? WHERE id=?", (req.seed, user["id"]))
        await db_.commit()
        return await _refresh_after(db_, user["id"])

@router.post("/achievements/{ach_id}/claim")
async def claim_ach(ach_id: str):
    async with db.get_conn() as db_:
        user = await get_user(db_)
        if ach_id not in achievements.BY_ID:
            raise HTTPException(400, "Obiettivo inesistente.")
        ach = achievements.BY_ID[ach_id]
        cur = await db_.execute("SELECT progress, claimed FROM achievements WHERE user_id=? AND ach_id=?", (user["id"], ach_id))
        row = await cur.fetchone()
        if row is None:
            await db_.execute("INSERT INTO achievements(user_id, ach_id, progress, claimed) VALUES(?,?,0,0)", (user["id"], ach_id))
            await db_.commit()
            raise HTTPException(400, "Obiettivo non ancora completato.")
        if row["claimed"]:
            raise HTTPException(400, "Gi\u00E0 riscosso.")
        if row["progress"] < ach["goal"]:
            raise HTTPException(400, "Obiettivo non ancora completato.")
        await db_.execute("UPDATE users SET coins=coins+?, gems=gems+? WHERE id=?",
                          (ach["reward_coins"], ach["reward_gems"], user["id"]))
        await db_.execute("UPDATE achievements SET claimed=1 WHERE user_id=? AND ach_id=?", (user["id"], ach_id))
        await db_.commit()
        return await _refresh_after(db_, user["id"])