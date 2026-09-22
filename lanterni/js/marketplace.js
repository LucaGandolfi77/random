// js/marketplace — Share and import cities

export class Marketplace {
  constructor() {
    this.importedCities = [];
  }

  async exportCity(state, screenshot) {
    const exportData = {
      version: 1,
      game: 'lanterni',
      state,
      screenshot: screenshot || null,
      exportedAt: Date.now()
    };

    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const file = new File([blob], 'lanterni-city.json', { type: 'application/json' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'La mia città di Lanterni',
          text: 'Importa la mia città nel tuo gioco!',
          files: [file]
        });
        return true;
      } catch (e) {
        if (e.name === 'AbortError') return false;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lanterni-city.json';
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  async importFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      return this.importFromString(text);
    } catch {
      return null;
    }
  }

  async importFromFile() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) { resolve(null); return; }
        try {
          const text = await file.text();
          resolve(this.importFromString(text));
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  }

  importFromString(text) {
    try {
      const data = JSON.parse(text);
      if (data.game !== 'lanterni' || !data.state) return null;
      this.importedCities.push(data);
      return data;
    } catch {
      return null;
    }
  }

  getImportedCities() {
    return this.importedCities;
  }

  clearImports() {
    this.importedCities = [];
  }
}
