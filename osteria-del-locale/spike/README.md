# Narrator spike

This harness answers one question: **can a model small enough to download on a phone describe a scene it has been handed, without inventing anything, without mentioning dice, and without looping?**

It is not a demo of the game. It is the measurement that decides what ships.

## The design under test

The engine decides what happens. The model only describes it. A model never gets authority over state, never has to emit JSON, and never sees the full transcript. It receives a short brief with a `beat`, a few engine-written facts, who is present, and a one-line chronicle, then returns prose.

That split exists because a 0.5B model cannot hold game state. Given that job it will contradict itself. Given this job it has a real chance of behaving.

## Backends

| Backend | Weights (measured on the Hub) | Purpose |
| --- | --- | --- |
| `template` | 0 B | The floor. Zero download, no GPU, works on iOS. The game must be fully playable on this. |
| `smol-135m` | 108 MB WebGPU / 140 MB WASM | Lower bound probe. Expected to fail. |
| `smol-360m` | 260 MB WebGPU / 348 MB WASM | The Lite tier candidate. |
| `qwen-0.5b` | 461 MB WebGPU / 488 MB WASM | The Standard tier candidate. |

Download size depends on the device because the dtype does: `q4f16` on WebGPU, `uint8` on the WASM fallback.

## Running it

```bash
npm install
npm run build
npm run spike        # interactive, opens the bench in a browser
```

Headless, which is how the results below were produced:

```bash
node spike/run-headless.mjs --backends template --out ../spike/RESULTS.md
node spike/run-headless.mjs --backends qwen-0.5b --cases adversarial-01,adversarial-02
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--backends` | `template` | Comma-separated backend ids |
| `--cases` | `all` | Case ids, or `all` |
| `--params` | sampled | Label written into the report |
| `--out` | `../spike/RESULTS.md` | Where to write the report |
| `--load-timeout` | `1800000` | Model download and warmup budget, ms |
| `--no-coi` | off | Drop COOP/COEP to force single-threaded WASM |

Run each backend separately. Running them in one invocation shares the page, and a model that crashed leaves no usable record for the next one.

## What gets measured

`RESULTS.md` is generated, never hand-edited. Each case records:

- **TTFT** — time to first streamed token. This is the number that decides whether the game feels alive.
- **tok/s** — throughput after the first token.
- **Format pass** — an automatic gate: 2 to 4 sentences, no markdown, no system language, no meta talk, repetition index under 0.25, non-empty, under 900 characters.

The gate is necessary but not sufficient. A model can pass it and still write badly. **Prose quality is a human read**, which is what the transcript section is for.

One caveat on `tok/s` for the template backend: it includes a deliberate 12 ms per word delay for the typewriter effect, so it measures perceived speed, not throughput. It is not comparable to a model's `tok/s`.

## Why the demo has its own encoder

`npm run demo` produces `demo/drowned-ox.gif`. The ffmpeg binary bundled with
Playwright is built without the `image2` demuxer, so it cannot read a numbered
PNG sequence at all. Rather than depend on a system ffmpeg, `tools/gif.mjs` is a
dependency-free encoder: it decodes PNG via `node:zlib`, quantizes to a 6x6x6
cube when the frame has more than 256 colours, and writes GIF89a with LZW.

The interesting part was the LZW. GIF widens the code one step later in the
encoder than in the decoder, because the decoder only learns a dictionary entry
once it has read the following code. Getting that off-by-one wrong produces a
stream that still has valid headers, a valid trailer and sub-blocks of the right
length, and decodes to garbage with no error at all. `tools/gif.test.ts` now
round trips 49 sequences across every code size and length combination.

Verified against PIL, which is an independent decoder: all frames load, and the
worst per-channel error against the source screenshot is 25 of 255.

## Results so far

### Template narrator — 20/20 clean

`RESULTS.md`. Every case passes every check. This is the tier that ships where no model is available, so this number matters more than it looks: it means the game is never blocked on a download.

### SmolLM2-135M — 0/3 clean, and not close

`RESULTS-135m.md`, measured on the WASM fallback:

| | |
| --- | --- |
| TTFT | 19.4 s |
| Throughput | 4.2 tok/s |
| Format pass | 0% |

Every case failed, and it failed in three different ways: one sentence where the brief asked for two to four, eight sentences where the brief asked for two to four, and markdown where the brief forbade it. The output does not attempt the task. It invents unrelated narrative, echoes the instruction back, and leaks fragments of the prompt.

This is the expected floor, and it is a useful calibration point: the harness is capable of failing loudly rather than scoring everything green. If the real candidates come back clean, that is meaningful.

## What could not be measured here

The container this was built in has 2 CPU cores, about 2.3 GB of available RAM, and no GPU adapter. Measured consequences:

- **No WebGPU.** Every model run went through the WASM fallback, so all `tok/s` numbers are pessimistic. A phone with a working adapter is a different order of magnitude.
- **The 348 MB and 461 MB models crash the renderer** with `Target crashed`, reproducibly, with and without cross-origin isolation. The 140 MB model runs fine. This is a memory ceiling in the container, not a defect in the project.
- **Cache Storage rejects large weight responses.** `Failed to execute 'put' on 'Cache': Unexpected internal error` appeared on every 348 MB download. This one is real and it is fixed: `src/platform/modelCache.ts` backs the weights with OPFS instead, which is also what makes the delete-and-evict path possible later.

So the decision this spike was built to make — **does a 0.5B model clear the format gate?** — is still open. The container has roughly 2 GB available and the 135M model is the largest thing that fits; everything larger crashes the renderer. Run the real candidates on a real machine:

```bash
npm run build
node spike/run-headless.mjs --backends qwen-0.5b --out ../spike/RESULTS-qwen.md
node spike/run-headless.mjs --backends smol-360m --out ../spike/RESULTS-360m.md
```

Expect it to take a while on a WASM-only machine. A 40-second TTFT per case is normal for this class of hardware, which is itself part of the answer: if the device needs the WASM fallback, the game is barely playable regardless of how good the prose is.

If it fails, the kill-gate fires and the game ships on the template narrator with this harness as its documentation. That is a valid outcome, not a failure: it would mean the project's honest claim is "LLM narration on-device is not viable below ~1B, and here is the measurement that says so."

## Cases

Twenty briefs in `cases.ts`, grouped:

- **entry** — describe a place under a length cap.
- **outcome** — describe an engine-decided result, including absurd ones.
- **dialogue** — give NPCs a voice without inventing their lines.
- **stress** — long history, a repetition trap, six facts at once.
- **adversarial** — out-of-world actions, a scene where nothing happens, cold start, an NPC the engine just invented, and a brief that deliberately contradicts the player's action.

The adversarial group is the one that matters. A model that handles `adversarial-02` (nothing happened, and padding is the only way to fill the space) without padding is one you can put in front of a player.