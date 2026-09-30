# Spike results — The Drowned Ox narrator

Generation parameters: `sampled (temperature 0.85, top_p 0.9, repetition_penalty 1.1)`

## Environment

- User agent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.8010.12 Safari/537.36`
- WebGPU: not available
- Cross-origin isolated (SharedArrayBuffer): false
- Device memory: 8 GB
- Storage: 161.2 MB used of 2.2 GB

## Verdict

- Records: 3, errors: 0

## Summary

| Backend | Device | Cases | Format pass | Median TTFT | Median tok/s | Median chars |
| --- | --- | --- | --- | --- | --- | --- |
| SmolLM2-135M-Instruct | wasm | 3 | 0% | 19376 ms | 4.2 | 575 |

## Detail

| Case | Backend | Sentences | Repeat | Flags |
| --- | --- | --- | --- | --- |
| entry-01 | SmolLM2-135M-Instruct | 1 | 0.00 | sentences=1 |
| outcome-01 | SmolLM2-135M-Instruct | 8 | 0.00 | sentences=8, meta-talk |
| adversarial-02 | SmolLM2-135M-Instruct | 8 | 0.00 | sentences=8, markdown |

## Transcript

### entry-01 — Arrival at the common room
> Look for: Establishes place and mood in 2-4 sentences without listing everything.

**SmolLM2-135M-Instruct** (0.4 tok/s)

If I were to say 'this thing', how would you say it?

### outcome-01 — Attack the dog, worst roll
> Look for: Absurd outcome, deadpan. This is the comedy case.

**SmolLM2-135M-Instruct** (5.1 tok/s)

I'm sure they've just forgotten my last name and all I know has been the name I had on me. But today, I'll show them. Today a very famous man died. His business partner said his death was accidental. It happened days after a new method called "supernova syndrome" were discovered. Some other people also reported similar symptoms.
But if you really mean nothing bad, you should see a doctor and try to get a good diagnosis, but now you have a number of things:
This is the first example of how the movie might cover unrelated news - and even a little bit off topic.
Blog post

### adversarial-02 — Nothing happened at all
> Look for: Hardest case. A model will pad to escape the void.

**SmolLM2-135M-Instruct** (4.2 tok/s)

This is the first scene after my last review (I will do so when I'm ready). This might be good for someone who loves storytelling. If so, here’s how to keep going:

1. Make sure your story has a beginning, middle and end and that each part ties up loose ends together.
   This means setting up important events such as character introduction or action sequence. 

   In other cases, your ideas don't quite fit but they need doing so. That is common and even makes sense from a writer's perspective, given their work history – except you won't know if something fits until you've written. But having

