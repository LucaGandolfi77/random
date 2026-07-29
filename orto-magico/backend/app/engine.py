import time
from . import catalog

def tick(plot):
    if plot["seed"] is None:
        return plot
    now = time.time()
    seed = catalog.SEEDS.get(plot["seed"])
    if not seed:
        return plot
    last = plot["last_tick"] or plot["planted_at"] or now
    elapsed = max(0.0, now - last)
    if elapsed <= 0:
        plot["last_tick"] = now
        return plot
    decay = catalog.WATER_DECAY
    water = plot["water"]
    time_until_dry = water / decay if decay > 0 else elapsed
    speed = 2.0 if plot["fertilized"] else 1.0
    if elapsed <= time_until_dry:
        growth_add = elapsed * speed
        water = max(0.0, water - decay * elapsed)
    else:
        growth_add = time_until_dry * speed
        water = 0.0
    plot["grown_seconds"] = (plot["grown_seconds"] or 0) + growth_add
    plot["water"] = round(water)
    plot["last_tick"] = now
    return plot

def status_of(plot, seed):
    if plot["seed"] is None:
        return ("empty", None, None)
    if not seed:
        return ("empty", None, None)
    if plot["grown_seconds"] >= seed["growth"]:
        return ("ready", seed["growth"], plot["grown_seconds"])
    if plot["water"] <= 0:
        return ("thirsty", seed["growth"], plot["grown_seconds"])
    return ("growing", seed["growth"], plot["grown_seconds"])

def speedup_gems(cost_factor=0.1, min_gems=1):
    now = time.time()
    def cost(plot):
        seed = catalog.SEEDS.get(plot["seed"])
        if not seed or plot["grown_seconds"] >= seed["growth"]:
            return 0
        remaining = seed["growth"] - plot["grown_seconds"]
        g = max(min_gems, int(remaining * cost_factor / 60))
        return g
    return cost