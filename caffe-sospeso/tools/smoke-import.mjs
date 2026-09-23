const shim = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  createDocumentFragment() { return {}; },
  createElement() { return { classList: { add(){}, toggle(){} }, dataset:{}, style:{}, addEventListener(){}, setAttribute(){}, append(){}, appendChild(){}, replaceChildren(){} }; },
  matchMedia() { return { matches: false }; },
};
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: undefined }, writable: true });
Object.defineProperty(globalThis, 'document', { value: shim, writable: true });
const files = [
  'js/config.js','js/i18n.js','js/utils.js','js/services/storage.js','js/services/audio.js',
  'js/services/pwa.js','js/model.js','js/view.js','js/controller.js',
  'js/services/share.js','js/services/ambient.js','js/services/ai.js',
];
let failed = 0;
for (const f of files) {
  try {
    await import(`../${f}`);
    console.log(`OK   ${f}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${f} -> ${e.message.split('\n')[0]}`);
  }
}
if (failed) process.exit(1);
