import type { NarratorBackend, ProbeResult, SceneBrief } from './types';
import { GenerationAborted } from './types';

const FRAMES: Record<SceneBrief['beat'], ReadonlyArray<(who: string) => string>> = {
  deal: [
    (who) => `${who}'s hand stops halfway to their pocket, then completes the motion, because stopping was never really on the table.`,
    () => `It is done, in the sense that everyone now agrees it was done.`,
    (who) => `${who} is already looking past you at the next person through the door.`,
    () => `The evening continues, and is somewhat lighter for everyone involved.`,
    (who) => `${who} counts it twice, out loud, and finds it correct both times, which they take as an omen.`,
    () => `Nobody says the number out loud, which is how the number becomes a price.`,
  ],
  refused: [
    (who) => `${who} looks at you a moment longer than the question required, then offers a smile with nothing behind it.`,
    () => `No, and kindly, which somehow makes it worse.`,
    (who) => `${who} shakes their head once, slowly, the way you might wave off a fly.`,
    () => `The offer stays on the table where you left it, cooling.`,
    (who) => `${who} returns to a glass that was already clean.`,
    () => `The refusal is delivered like good news, which is the most insulting part.`,
  ],
  discovery: [
    (who) => `${who} answers before you have finished asking, then repeats it in case the first time did not land.`,
    () => `The shape of it is clear now, though not the details.`,
    (who) => `${who} offers one detail and then appears to think better of it.`,
    () => `Something settles into place, and you notice it settling, which is the unnerving part.`,
    (who) => `${who} checks the room first, and answers second.`,
    () => `The answer turns out to have been in the room the whole time, waiting to be asked for.`,
  ],
  danger: [
    () => `It stops, not because it wants to, but because it has decided you are not worth the trouble yet.`,
    (who) => `${who} takes one step back without appearing to decide to.`,
    () => `The temperature of the room does not change, but you notice it, and that is worse.`,
    () => `Everyone in the room has the same idea at the same moment and none of them look at each other.`,
    () => `A step forward happens, and no one admits to taking it.`,
    () => `Something has not happened yet, and the not-happening has a shape.`,
  ],
  awkward: [
    () => `Nothing happens, at length, and with feeling.`,
    (who) => `${who} waits, and the waiting has a texture, and the texture is unpleasant.`,
    () => `Nothing is said, and something behind the bar is set down very carefully.`,
    (who) => `${who} smiles at a point slightly to the left of your face and holds it there.`,
    () => `The silence takes on an address.`,
    () => `The moment passes, and takes something with it that you will not get back.`,
  ],
  chaos: [
    () => `This should not have happened, and it happened anyway, quickly.`,
    () => `The room adjusts, and does it without comment, the way a river adjusts to a stone.`,
    () => `For about four seconds the world is not entirely as it was.`,
    () => `Then it is again, and no one mentions it.`,
    (who) => `${who} has stopped what they were doing and has not started anything else.`,
    () => `Whatever that was, it is now simply the way things are here.`,
  ],
};

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: ReadonlyArray<T>, seed: number): T {
  const index = seed % items.length;
  const item = items[index];
  if (item === undefined) throw new Error('pick from empty array');
  return item;
}

function capitalise(line: string): string {
  if (line.length === 0) return line;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function closure(line: string): string {
  const trimmed = line.trimEnd();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * The template narrator never restates a fact. The engine's account is shown
 * directly above this line in the transcript, and repeating it would be both
 * redundant and a violation of the same rule the system prompt gives the model.
 * It only supplies the tone: deadpan connective tissue around what already
 * happened.
 */
export function narrateTemplate(brief: SceneBrief): string {
  const frames = FRAMES[brief.beat];
  const seed = hash([brief.beat, brief.action ?? '', ...brief.facts].join('|'));
  const who = brief.present[0] ?? 'The room';
  const sentences = [
    capitalise(closure(pick(frames, seed)(who))),
    capitalise(closure(pick(frames, seed + 3)(who))),
  ];
  return sentences.join(' ');
}

export function createTemplateBackend(): NarratorBackend {
  return {
    id: 'template',
    label: 'Template narrator',
    tier: 'zero',
    approxBytes: 0,

    async probe(): Promise<ProbeResult> {
      return { available: true, reason: 'Always available. No download, no GPU.' };
    },

    async load(): Promise<void> {},

    async narrate(brief: SceneBrief, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
      if (signal?.aborted) throw new GenerationAborted();
      const text = narrateTemplate(brief);
      for (const word of text.split(/(?<=\s)/)) {
        if (signal?.aborted) throw new GenerationAborted();
        onToken(word);
        // oxlint-disable-next-line no-await-in-loop -- typewriter effect is sequential by nature
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      return text;
    },

    async dispose(): Promise<void> {},
  };
}