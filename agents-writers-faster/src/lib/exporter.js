import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { withActionLog } from './action-log.js';
import { loadSeriesBundle } from './series-memory.js';
import { readText, writeJson, writeText } from './utils.js';

const execFileAsync = promisify(execFile);

export async function exportBundle(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'export',
    action: 'export-bundle',
    input: { options }
  }, async () => {
    const format = String(options.format || 'all').toLowerCase();
    const outputRoot = path.join(rootPath, options.output || 'exports');
    const bundle = await loadSeriesBundle(rootPath, {
      bookBible: {},
      timeline: { chapters: [] },
      styleGuide: {},
      outlineMemory: { chapter_outlines: [], next_targets: [], arc_metrics: {} }
    });
    const bookBible = bundle.bookBible;
    const timeline = bundle.timeline;
    const outlineMemory = bundle.outlineMemory;
    const exportName = bundle.activeBook.exportBaseName || bookBible.exportBaseName || bundle.activeBook.slug || slugify(bookBible.title || 'untitled-project');
    const cover = {
      title: bookBible.cover?.title || bookBible.title || bundle.activeBook.title,
      subtitle: bookBible.cover?.subtitle || '',
      author: bookBible.cover?.author || bundle.activeBook.cover?.author || 'OpenRouter Book Agents',
      tagline: bookBible.cover?.tagline || bundle.activeBook.cover?.tagline || bookBible.premise || '',
      color: bookBible.cover?.color || bundle.activeBook.cover?.color || '#7c9cff'
    };
    const chapters = await collectChapters(rootPath, timeline.chapters || []);

    if (!chapters.length) {
      throw new Error('No chapters available to export. Generate at least one chapter first.');
    }

    await fs.mkdir(outputRoot, { recursive: true });

    const outputs = [];

    if (format === 'markdown' || format === 'all') {
      outputs.push(await exportMarkdownBundle(outputRoot, exportName, bundle.activeBook, bookBible, timeline, outlineMemory, cover, chapters));
    }

    if (format === 'epub' || format === 'all') {
      outputs.push(await exportEpubBundle(outputRoot, exportName, bundle.activeBook, bookBible, timeline, outlineMemory, cover, chapters));
    }

    return {
      message: `Export complete for format ${format}.`,
      activeBookId: bundle.activeBook.id,
      outputs
    };
  });
}

async function collectChapters(rootPath, timelineChapters) {
  const chaptersDir = path.join(rootPath, 'chapters');
  const chapterMap = new Map();

  for (const chapter of timelineChapters) {
    const chapterId = String(chapter.chapter).padStart(2, '0');
    const finalPath = path.join(chaptersDir, `chapter_${chapterId}_final.md`);
    const draftPath = path.join(chaptersDir, `chapter_${chapterId}_draft.md`);
    const content = (await readText(finalPath, '')).trim() || (await readText(draftPath, '')).trim();

    chapterMap.set(chapter.chapter, {
      chapter: chapter.chapter,
      title: chapter.title || `Chapter ${chapter.chapter}`,
      summary: chapter.summary || '',
      unresolved_threads: chapter.unresolved_threads || [],
      arc_targets: chapter.arc_targets || [],
      next_arc_targets: chapter.next_arc_targets || [],
      vote_summary: chapter.vote_summary || null,
      content
    });
  }

  return [...chapterMap.values()].sort((left, right) => left.chapter - right.chapter);
}

async function exportMarkdownBundle(outputRoot, exportName, activeBook, bookBible, timeline, outlineMemory, cover, chapters) {
  const dirPath = path.join(outputRoot, `${exportName}-${activeBook.id}-markdown-bundle`);
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });

  const manifest = {
    title: bookBible.title,
    genre: bookBible.genre,
    premise: bookBible.premise,
    themes: bookBible.themes || [],
    exportBaseName: exportName,
    cover,
    bookId: activeBook.id,
    exportedAt: new Date().toISOString(),
    chapters: chapters.map((chapter) => ({
      chapter: chapter.chapter,
      title: chapter.title,
      summary: chapter.summary,
      arc_targets: chapter.arc_targets,
      next_arc_targets: chapter.next_arc_targets,
      vote_summary: chapter.vote_summary
    })),
    outline: outlineMemory
  };

  await writeJson(path.join(dirPath, 'manifest.json'), manifest);

  const combined = [];
  combined.push(`# ${cover.title || bookBible.title || 'Untitled Project'}`);
  if (cover.subtitle) combined.push(`## ${cover.subtitle}`);
  combined.push('');
  combined.push(`Author: ${cover.author}`);
  if (cover.tagline) combined.push('');
  if (cover.tagline) combined.push(`_${cover.tagline}_`);
  combined.push('');
  combined.push(`Genre: ${bookBible.genre || 'unknown'}`);
  combined.push('');
  combined.push(bookBible.premise || '');
  combined.push('');
  combined.push('## Active arc targets');
  combined.push('');
  combined.push(...(outlineMemory.next_targets || []).map((item) => `- ${item}`));
  combined.push('');

  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapter).padStart(2, '0')}.md`;
    const chapterText = [
      `# ${chapter.title}`,
      '',
      chapter.summary ? `> ${chapter.summary}` : '',
      '',
      chapter.content || '_No content available._',
      '',
      chapter.arc_targets?.length ? '## Arc targets' : '',
      ...(chapter.arc_targets || []).map((item) => `- ${item}`),
      '',
      chapter.next_arc_targets?.length ? '## Next arc targets' : '',
      ...(chapter.next_arc_targets || []).map((item) => `- ${item}`),
      ''
    ].filter(Boolean).join('\n');

    await writeText(path.join(dirPath, fileName), `${chapterText}\n`);
    combined.push(chapterText);
    combined.push('');
  }

  await writeText(path.join(dirPath, 'manuscript.md'), `${combined.join('\n')}\n`);

  return {
    format: 'markdown',
    path: dirPath
  };
}

async function exportEpubBundle(outputRoot, exportName, activeBook, bookBible, timeline, outlineMemory, cover, chapters) {
  const epubPath = path.join(outputRoot, `${exportName}-${activeBook.id}.epub`);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `${exportName}-epub-`));
  const oebpsDir = path.join(workDir, 'OEBPS');
  const metaInfDir = path.join(workDir, 'META-INF');

  await fs.mkdir(oebpsDir, { recursive: true });
  await fs.mkdir(metaInfDir, { recursive: true });

  await writeText(path.join(workDir, 'mimetype'), 'application/epub+zip');
  await writeText(path.join(metaInfDir, 'container.xml'), containerXml());
  await writeText(path.join(oebpsDir, 'styles.css'), epubStyles());
  await writeText(path.join(oebpsDir, 'cover.xhtml'), renderCoverXhtml(bookBible, cover));

  const chapterFiles = [];
  for (const chapter of chapters) {
    const fileName = `chapter-${String(chapter.chapter).padStart(2, '0')}.xhtml`;
    chapterFiles.push({ ...chapter, fileName, id: `chapter_${chapter.chapter}` });
    await writeText(path.join(oebpsDir, fileName), renderChapterXhtml(bookBible.title || 'Untitled Project', chapter));
  }

  await writeText(path.join(oebpsDir, 'nav.xhtml'), renderNavXhtml(cover.title || bookBible.title || 'Untitled Project', chapterFiles, outlineMemory));
  await writeText(path.join(oebpsDir, 'content.opf'), renderOpf(bookBible, cover, chapterFiles));

  await fs.rm(epubPath, { force: true });
  await execFileAsync('zip', ['-X0', epubPath, 'mimetype'], { cwd: workDir });
  await execFileAsync('zip', ['-Xr9D', epubPath, 'META-INF', 'OEBPS'], { cwd: workDir });
  await fs.rm(workDir, { recursive: true, force: true });

  return {
    format: 'epub',
    path: epubPath
  };
}

function containerXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;
}

function renderOpf(bookBible, cover, chapters) {
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const manifestItems = [
    '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="styles" href="styles.css" media-type="text/css"/>'
  ].concat(chapters.map((chapter) => `<item id="${chapter.id}" href="${chapter.fileName}" media-type="application/xhtml+xml"/>`));
  const spineItems = ['<itemref idref="cover"/>'].concat(chapters.map((chapter) => `<itemref idref="${chapter.id}"/>`)).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${slugify(bookBible.title || 'untitled-project')}</dc:identifier>
    <dc:title>${escapeXml(cover.title || bookBible.title || 'Untitled Project')}</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>${escapeXml(cover.author || 'OpenRouter Book Agents')}</dc:creator>
    ${cover.subtitle ? `<meta property="subtitle">${escapeXml(cover.subtitle)}</meta>` : ''}
    ${cover.tagline ? `<meta property="description">${escapeXml(cover.tagline)}</meta>` : ''}
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>
`;
}

function renderNavXhtml(title, chapters, outlineMemory) {
  const nextTargets = (outlineMemory.next_targets || []).map((target) => `<li>${escapeXml(target)}</li>`).join('');
  const chapterLinks = chapters.map((chapter) => `<li><a href="${chapter.fileName}">${escapeXml(chapter.title)}</a></li>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
  <head>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeXml(title)}</h1>
      <ol>${chapterLinks}</ol>
    </nav>
    <section>
      <h2>Next arc targets</h2>
      <ul>${nextTargets || '<li>No pending targets.</li>'}</ul>
    </section>
  </body>
</html>
`;
}

function renderChapterXhtml(bookTitle, chapter) {
  const body = markdownToXhtml(chapter.content || '_No content available._');
  const arcTargets = (chapter.arc_targets || []).map((target) => `<li>${escapeXml(target)}</li>`).join('');
  const nextTargets = (chapter.next_arc_targets || []).map((target) => `<li>${escapeXml(target)}</li>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>${escapeXml(chapter.title)} · ${escapeXml(bookTitle)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <article>
      <h1>${escapeXml(chapter.title)}</h1>
      ${chapter.summary ? `<p class="summary">${escapeXml(chapter.summary)}</p>` : ''}
      ${body}
      ${arcTargets ? `<section><h2>Arc targets</h2><ul>${arcTargets}</ul></section>` : ''}
      ${nextTargets ? `<section><h2>Next arc targets</h2><ul>${nextTargets}</ul></section>` : ''}
    </article>
  </body>
</html>
`;
}

function renderCoverXhtml(bookBible, cover) {
  const themes = (bookBible.themes || []).map((theme) => `<li>${escapeXml(theme)}</li>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>${escapeXml(cover.title || bookBible.title || 'Untitled Project')}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <article class="cover-page" style="border-top: 12px solid ${escapeXml(cover.color || '#7c9cff')};">
      <h1>${escapeXml(cover.title || bookBible.title || 'Untitled Project')}</h1>
      ${cover.subtitle ? `<h2>${escapeXml(cover.subtitle)}</h2>` : ''}
      <p class="summary">${escapeXml(cover.author || 'OpenRouter Book Agents')}</p>
      ${cover.tagline ? `<p>${escapeXml(cover.tagline)}</p>` : ''}
      ${bookBible.premise ? `<p>${escapeXml(bookBible.premise)}</p>` : ''}
      ${themes ? `<section><h2>Themes</h2><ul>${themes}</ul></section>` : ''}
    </article>
  </body>
</html>
`;
}

function markdownToXhtml(markdown) {
  const blocks = String(markdown).trim().split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n');
    if (lines[0].startsWith('### ')) {
      return `<h3>${escapeXml(lines[0].slice(4))}</h3>`;
    }
    if (lines[0].startsWith('## ')) {
      return `<h2>${escapeXml(lines[0].slice(3))}</h2>`;
    }
    if (lines[0].startsWith('# ')) {
      return `<h1>${escapeXml(lines[0].slice(2))}</h1>`;
    }
    if (lines.every((line) => line.trim().startsWith('- '))) {
      return `<ul>${lines.map((line) => `<li>${escapeXml(line.trim().slice(2))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map((line) => escapeXml(line)).join('<br />')}</p>`;
  }).join('\n');
}

function epubStyles() {
  return `body { font-family: Georgia, serif; line-height: 1.5; }
article { max-width: 44em; margin: 0 auto; }
h1, h2, h3 { font-family: Arial, sans-serif; }
.summary { font-style: italic; color: #444; }
.cover-page { padding-top: 4rem; }
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-project';
}
