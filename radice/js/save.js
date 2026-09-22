const SAVE_INTERVAL = 30000;
let saveTimer = null;

function startAutoSave() {
  saveTimer = setInterval(() => {
    const state = getState();
    saveState(state);
  }, SAVE_INTERVAL);
}

function stopAutoSave() {
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
}

function quickSave() {
  saveState(getState());
}
