import { showToast } from '../../utils/helpers.js';

class ShareTarget {
  constructor() {
    this.supported = 'share' in navigator;
    this.registered = false;
  }

  async init() {
    if (!this.supported) {
      console.log('[Radice] Web Share API not supported');
      return false;
    }

    try {
      if ('ShareTarget' in window) {
        await window.ShareTarget.register({
          action: '/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        });
        this.registered = true;
        console.log('[Radice] Share Target registered');
        return true;
      }
    } catch (e) {
      console.log('[Radice] ShareTarget registration not available:', e.message);
    }

    return true;
  }

  async shareContent(title, text, url) {
    if (!this.supported) {
      showToast('Condivisione non supportata su questo dispositivo');
      return false;
    }

    try {
      await navigator.share({ title, text, url });
      showToast('📤 Condiviso con successo!');
      return true;
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[Radice] Share cancelled by user');
      } else {
        console.warn('[Radice] Share failed:', e);
      }
      return false;
    }
  }

  async shareChapter(chapterId) {
    const chapters = window.CHAPTERS || [];
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return false;

    return this.shareContent(
      `📖 Radice — ${chapter.title}`,
      `Ho appena scoperto il capitolo "${chapter.title}" nell'albero! Leggi la tua storia su Radice.`,
      window.location.href
    );
  }

  async shareBook(bookId) {
    const books = window.BOOKS || [];
    const book = books.find(b => b.id === bookId);
    if (!book) return false;

    return this.shareContent(
      `📖 Radice — ${book.title}`,
      `Sto leggendo "${book.title}" nell'albero antico! ${book.flavor}`,
      window.location.href
    );
  }

  getSupport() {
    return {
      share: this.supported,
      shareTarget: this.registered
    };
  }
}

const shareTarget = new ShareTarget();
export default shareTarget;
export { ShareTarget };
