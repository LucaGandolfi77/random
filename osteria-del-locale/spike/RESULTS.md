# Spike results — The Drowned Ox narrator

Generation parameters: `sampled (temperature 0.85, top_p 0.9, repetition_penalty 1.1)`

## Environment

- User agent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.8010.12 Safari/537.36`
- WebGPU: not available
- Cross-origin isolated (SharedArrayBuffer): true
- Device memory: 8 GB
- Storage: 0 B used of 2.0 GB

## Verdict

- Records: 20, errors: 0

## Summary

| Backend | Device | Cases | Format pass | Median TTFT | Median tok/s | Median chars |
| --- | --- | --- | --- | --- | --- | --- |
| Template narrator | template | 20 | 100% | 0 ms | 105.0 | 173 |

## Detail

| Case | Backend | Sentences | Repeat | Flags |
| --- | --- | --- | --- | --- |
| entry-01 | Template narrator | 3 | 0.00 | clean |
| entry-02 | Template narrator | 3 | 0.00 | clean |
| entry-03 | Template narrator | 3 | 0.00 | clean |
| outcome-01 | Template narrator | 3 | 0.00 | clean |
| outcome-02 | Template narrator | 3 | 0.00 | clean |
| outcome-03 | Template narrator | 3 | 0.00 | clean |
| outcome-04 | Template narrator | 3 | 0.00 | clean |
| outcome-05 | Template narrator | 3 | 0.00 | clean |
| dialogue-01 | Template narrator | 3 | 0.00 | clean |
| dialogue-02 | Template narrator | 3 | 0.00 | clean |
| dialogue-03 | Template narrator | 3 | 0.00 | clean |
| dialogue-04 | Template narrator | 3 | 0.00 | clean |
| stress-01 | Template narrator | 3 | 0.00 | clean |
| stress-02 | Template narrator | 3 | 0.00 | clean |
| stress-03 | Template narrator | 3 | 0.00 | clean |
| adversarial-01 | Template narrator | 3 | 0.00 | clean |
| adversarial-02 | Template narrator | 3 | 0.00 | clean |
| adversarial-03 | Template narrator | 3 | 0.00 | clean |
| adversarial-04 | Template narrator | 3 | 0.00 | clean |
| adversarial-05 | Template narrator | 3 | 0.00 | clean |

## Transcript

### entry-01 — Arrival at the common room
> Look for: Establishes place and mood in 2-4 sentences without listing everything.

**Template narrator** (102.4 tok/s)

You learn the shape of it now, though not the details. The innkeeper offers one detail and then appears to think better of it. You are standing in the common room of the Drowned Ox.

### entry-02 — The cellar
> Look for: Does it invent objects beyond the facts?

**Template narrator** (104.2 tok/s)

You take one step forward without appearing to decide to. It stops, not because it wants to, but because it has decided you are not worth the trouble yet. You are in the cellar with eleven barrels and one crate.

### entry-03 — The room upstairs
> Look for: Long input, must not ramble past 4 sentences.

**Template narrator** (110.9 tok/s)

The silence takes on an address. Nothing happens, at length, and with feeling. You climb nine stairs to a landing with two doors.

### outcome-01 — Attack the dog, worst roll
> Look for: Absurd outcome, deadpan. This is the comedy case.

**Template narrator** (104.8 tok/s)

The room adjusts, and does it without comment, the way a river adjusts to a stone. For about four seconds the world is not entirely as it was. You swung at the landlord's dog and missed.

### outcome-02 — Attack the dog, best roll
> Look for: Contrast with outcome-01. Does it contradict the fact it is given?

**Template narrator** (105.4 tok/s)

It is done, in the sense that everyone now agrees it was done. The dog is already looking past you at the next person through the door. You swung at the landlord's dog and connected.

### outcome-03 — Bribe accepted, price raised
> Look for: Numeric consequence. Must not mention numbers or rules.

**Template narrator** (122.1 tok/s)

The innkeeper is already looking past you at the next person through the door. You walk away lighter and somebody considerably richer. You offered the innkeeper two silver.

### outcome-04 — Refused cleanly
> Look for: Does it invent a counter-offer that the engine did not authorise?

**Template narrator** (111.9 tok/s)

The innkeeper returns to a glass that was already clean. The innkeeper looks at you a moment longer than the question required, then offers a smile with nothing behind it. You asked the innkeeper for a free room.

### outcome-05 — Discovery of the dog's name
> Look for: Must convey a fact without listing it as data.

**Template narrator** (103.3 tok/s)

You learn the shape of it now, though not the details. The innkeeper offers one detail and then appears to think better of it. You asked the dog its name.

### dialogue-01 — Innkeeper lies about the room
> Look for: Character voice in narration, not in invented dialogue formatting.

**Template narrator** (118.6 tok/s)

The innkeeper is already looking past you at the next person through the door. You walk away lighter and somebody considerably richer. The innkeeper described the room as warm and dry.

### dialogue-02 — Innkeeper invents a price
> Look for: Should treat the lie as normal, not expose it.

**Template narrator** (104.1 tok/s)

The innkeeper waits, and the waiting has a texture, and the texture is unpleasant. You say nothing, and something behind the bar is set down very carefully. You asked the price of a room for the second time.

### dialogue-03 — A regular warns you
> Look for: Two NPCs in scene, must not conflate them.

**Template narrator** (104.4 tok/s)

You learn the shape of it now, though not the details. The regular offers one detail and then appears to think better of it. The regular told you the innkeeper has buried three tenants behind the woodshed.

### dialogue-04 — NPC refuses to answer
> Look for: Refusal must not produce a long speech.

**Template narrator** (105.4 tok/s)

No, and kindly, which somehow makes it worse. The barkeep shakes their head once, slowly, the way you might wave off a fly. You asked the barkeep what is in the cellar.

### stress-01 — Long history, eight entries
> Look for: Does it still obey 2-4 sentences under a long context?

**Template narrator** (105.2 tok/s)

The room adjusts, and does it without comment, the way a river adjusts to a stone. For about four seconds the world is not entirely as it was. You climbed the stairs.

### stress-02 — Repetitive history, loop trap
> Look for: Repetition trap. Small models copy their own input.

**Template narrator** (107.0 tok/s)

Everyone in the room has the same idea at the same moment and none of them look at each other. You take one step forward without appearing to decide to. Nothing happened.

### stress-03 — Six facts, length pressure
> Look for: Must still cap at 4 sentences.

**Template narrator** (106.7 tok/s)

Then it is again, and no one mentions it. The innkeeper has stopped what they were doing and has not started anything else. There are nine tables.

### adversarial-01 — Out-of-world action
> Look for: Player says "cast fireball". Must not break character or grant it.

**Template narrator** (97.5 tok/s)

The silence takes on an address. Nothing happens, at length, and with feeling. You said the words for a fire you had no way of making.

### adversarial-02 — Nothing happened at all
> Look for: Hardest case. A model will pad to escape the void.

**Template narrator** (113.7 tok/s)

The innkeeper waits, and the waiting has a texture, and the texture is unpleasant. You say nothing, and something behind the bar is set down very carefully. Nothing happened.

### adversarial-03 — Cold start, empty history
> Look for: Turn one of a new game. No scaffolding to imitate.

**Template narrator** (103.0 tok/s)

It is done, in the sense that everyone now agrees it was done. The innkeeper is already looking past you at the next person through the door. You asked for a room.

### adversarial-04 — NPC the engine just invented
> Look for: An NPC name that appears in facts but not in history. Does it drift?

**Template narrator** (100.9 tok/s)

You learn the shape of it now, though not the details. A man by the fire offers one detail and then appears to think better of it. You asked about Sergeant Malk.

### adversarial-05 — Fact contradicts the action
> Look for: The brief deliberately fights the action. Facts must win.

**Template narrator** (95.7 tok/s)

The temperature of the room does not change, but you notice it, and that is worse. Everyone in the room has the same idea at the same moment and none of them look at each other. You said you would leave and go home.

