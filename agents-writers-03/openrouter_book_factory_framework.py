# OpenRouter Book Factory Framework v3
# Expanded single-file framework with memory, scheduler, A/B, templates, export
# Requires: pip install httpx aiosqlite pyyaml ebooklib reportlab

import asyncio
import html
import hashlib
import json
import math
import os
import re
import threading
import time
from dataclasses import asdict, dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import aiosqlite
import httpx
import yaml
from ebooklib import epub
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


PDF_COMMENT_SPLIT = '<!-- consistency_check -->'
PDF_HTML_COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)
PDF_HEADING_RE = re.compile(r'^(#{1,6})\s+(.*)$')
PDF_ORDERED_LIST_RE = re.compile(r'^(\d+)\.\s+(.*)$')
PDF_TABLE_SEPARATOR_RE = re.compile(r'^\|(?:\s*:?-{3,}:?\s*\|)+\s*$')
CHAPTER_FILE_RE = re.compile(r'^(?P<job_id>.+)_chapter_(?P<number>\d+)(?P<suffix>_[a-z]{2})?\.md$')


def embed_text(text: str, dim: int = 128):
    vector = [0.0] * dim
    for word in text.lower().split():
        index = int(hashlib.md5(word.encode()).hexdigest(), 16) % dim
        vector[index] += 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(left, right):
    return sum(x * y for x, y in zip(left, right))


API_KEY = os.getenv('OPENROUTER_API_KEY', '')
BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
DATA_DIR = Path('book_factory_data')
DATA_DIR.mkdir(exist_ok=True)
BOOKS_DIR = DATA_DIR / 'books'
BOOKS_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / 'state.db'
TEMPLATES = DATA_DIR / 'templates'
TEMPLATES.mkdir(exist_ok=True)
DEFAULT_TEMPLATE = TEMPLATES / 'fantasy.yaml'
if not DEFAULT_TEMPLATE.exists():
    DEFAULT_TEMPLATE.write_text('genre: fantasy\nstyle: epic\ntone: immersive\n', encoding='utf-8')


def book_subdir(job_id):
    """Ensure and return the subdirectory path for a given book job_id."""
    sub = BOOKS_DIR / str(job_id)
    sub.mkdir(parents=True, exist_ok=True)
    return sub


def unique_models(*groups):
    ordered = []
    seen = set()
    for group in groups:
        for model in group:
            if model and model not in seen:
                ordered.append(model)
                seen.add(model)
    return ordered


FREE_FALLBACK_MODELS = [
    'openrouter/free',
    'openai/gpt-oss-20b:free',
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'liquid/lfm-2.5-1.2b-instruct:free'
]

MODELS = {
    'planner': unique_models(
        ['google/gemma-4-26b-a4b-it:free', 'openrouter/free', 'openai/gpt-oss-20b:free'],
        FREE_FALLBACK_MODELS
    ),
    'writer': unique_models(
        ['google/gemma-4-31b-it:free', 'openrouter/free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.3-70b-instruct:free'],
        FREE_FALLBACK_MODELS
    ),
    'editor': unique_models(
        ['nvidia/nemotron-3-nano-30b-a3b:free', 'openrouter/free', 'openai/gpt-oss-20b:free'],
        FREE_FALLBACK_MODELS
    ),
    'scorer': unique_models(
        ['nvidia/nemotron-3-super-120b-a12b:free', 'openrouter/free', 'openai/gpt-oss-20b:free', 'google/gemini-2.0-flash-exp:free'],
        FREE_FALLBACK_MODELS
    ),
    'inventor': unique_models(
        ['google/gemma-4-26b-a4b-it:free', 'openrouter/free', 'openai/gpt-oss-20b:free'],
        FREE_FALLBACK_MODELS
    ),
    'translator': unique_models(
        ['google/gemma-4-31b-it:free', 'openrouter/free', 'openai/gpt-oss-20b:free', 'google/gemini-2.0-flash-exp:free'],
        FREE_FALLBACK_MODELS
    )
}


def append_unique_strings(existing, additions):
    result = list(existing or [])
    seen = {str(item).strip() for item in result}
    for item in additions or []:
        text = str(item).strip()
        if text and text not in seen:
            result.append(text)
            seen.add(text)
    return result


def normalize_character_updates(updates):
    if isinstance(updates, dict):
        return updates

    normalized = {}
    for entry in updates or []:
        if isinstance(entry, dict):
            name = str(entry.get('name') or entry.get('character') or '').strip()
            if not name:
                continue
            normalized[name] = {
                key: value
                for key, value in entry.items()
                if key not in {'name', 'character'}
            }
            continue

        name = str(entry).strip()
        if name:
            normalized[name] = {}

    return normalized


def normalize_summary_list(values):
    if isinstance(values, list):
        return values
    if values in (None, ''):
        return []
    return [values]


def merge_character_profiles(existing, updates):
    merged = dict(existing or {})
    normalized_updates = normalize_character_updates(updates) or {}

    for name, details in normalized_updates.items():
        current = dict(merged.get(name) or {})

        # If the provided details are a list, treat them as free-form notes.
        if isinstance(details, list):
            current['notes'] = append_unique_strings(current.get('notes', []), details)
            merged[name] = current
            continue

        # If details is not a dict (e.g. a scalar), append it as a single note.
        if not isinstance(details, dict):
            text = str(details) if details not in (None, '') else ''
            if text:
                current['notes'] = append_unique_strings(current.get('notes', []), [text])
            merged[name] = current
            continue

        for key, value in (details or {}).items():
            if isinstance(value, list):
                current[key] = append_unique_strings(current.get(key, []), value)
            elif isinstance(value, dict):
                current[key] = {**(current.get(key) or {}), **value}
            elif value not in (None, ''):
                current[key] = value

        merged[name] = current

    return merged


def merge_summary_into_memory(memory, summary):
    memory['events'] = append_unique_strings(memory.get('events', []), normalize_summary_list(summary.get('events', [])))
    memory['open_threads'] = append_unique_strings(memory.get('open_threads', []), normalize_summary_list(summary.get('open_threads', [])))
    memory['characters'] = merge_character_profiles(memory.get('characters', {}), summary.get('characters', {}))
    return memory


def extract_json_object(text, fallback):
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end < start:
        return json.loads(json.dumps(fallback))

    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return json.loads(json.dumps(fallback))


def sanitize_job_id(value):
    sanitized = re.sub(r'[^a-z0-9]+', '_', str(value).lower()).strip('_')
    return sanitized or f'book_{int(time.time())}'


def language_file_suffix(language):
    return '' if language == 'en' else f'_{language}'


def chapter_file_sort_key(path):
    match = CHAPTER_FILE_RE.match(path.name)
    if not match:
        return (path.name, 0, '')

    return (match.group('job_id'), int(match.group('number')), match.group('suffix') or '')


def strip_markdown_formatting(text):
    cleaned = text.strip()
    if not cleaned:
        return ''

    cleaned = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', r'\1', cleaned)
    cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)
    cleaned = cleaned.replace('**', '').replace('__', '').replace('`', '')
    cleaned = re.sub(r'(?<!\*)\*(?!\*)(.*?) (?<!\*)\*(?!\*)', r'\1', cleaned)
    cleaned = re.sub(r'(?<!_)_(?!_)(.*?) (?<!_)_(?!_)', r'\1', cleaned)
    return cleaned.strip()


def split_markdown_blocks_for_pdf(text):
    sanitized = text.split(PDF_COMMENT_SPLIT, 1)[0]
    sanitized = PDF_HTML_COMMENT_RE.sub('', sanitized)
    sanitized = sanitized.replace('\r\n', '\n').replace('\r', '\n')

    blocks = []
    current = []

    def flush_current():
        if current:
            blocks.append(('paragraph', ' '.join(current).strip()))
            current.clear()

    for raw_line in sanitized.split('\n'):
        line = raw_line.strip()
        if not line:
            flush_current()
            continue

        if line == '---':
            flush_current()
            blocks.append(('spacer', ''))
            continue

        heading = PDF_HEADING_RE.match(line)
        if heading:
            flush_current()
            blocks.append((f'heading_{len(heading.group(1))}', heading.group(2).strip()))
            continue

        if line.startswith('**') and line.endswith('**'):
            flush_current()
            blocks.append(('heading_2', line))
            continue

        if PDF_TABLE_SEPARATOR_RE.match(line):
            continue

        if line.startswith('|'):
            flush_current()
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            blocks.append(('table_row', ' | '.join(cell for cell in cells if cell)))
            continue

        ordered_match = PDF_ORDERED_LIST_RE.match(line)
        if ordered_match:
            flush_current()
            blocks.append(('list_item', f"{ordered_match.group(1)}. {ordered_match.group(2).strip()}"))
            continue

        if line.startswith(('- ', '* ')):
            flush_current()
            blocks.append(('list_item', f"• {line[2:].strip()}"))
            continue

        current.append(line)

    flush_current()
    return blocks


def markdown_story_for_pdf(text, styles):
    story = []
    for block_type, content in split_markdown_blocks_for_pdf(text):
        if block_type == 'spacer':
            story.append(Spacer(1, 6))
            continue

        style_name = 'BodyText'
        if block_type.startswith('heading_'):
            try:
                level = int(block_type.rsplit('_', 1)[1])
            except ValueError:
                level = 3
            style_name = 'Heading2' if level <= 2 else 'Heading3'

        cleaned = strip_markdown_formatting(content)
        if not cleaned:
            continue

        story.append(Paragraph(html.escape(cleaned, quote=False), styles[style_name]))
        story.append(Spacer(1, 8 if style_name != 'BodyText' else 6))

    return story


class RateLimiter:
    def __init__(self, per_minute=20, per_day=1000):
        self.pm = per_minute
        self.pd = per_day
        self.minute_calls = []
        self.day_calls = []
        self.lock = asyncio.Lock()

    async def acquire(self):
        while True:
            async with self.lock:
                now = time.time()
                self.minute_calls = [stamp for stamp in self.minute_calls if now - stamp < 60]
                self.day_calls = [stamp for stamp in self.day_calls if now - stamp < 86400]

                if len(self.day_calls) >= self.pd:
                    raise RuntimeError('Daily limit reached')

                if len(self.minute_calls) < self.pm:
                    self.minute_calls.append(now)
                    self.day_calls.append(now)
                    return

                wait_for = max(60 - (now - self.minute_calls[0]), 0.1)

            await asyncio.sleep(wait_for)


class OpenRouterClient:
    def __init__(self, limiter):
        self.limiter = limiter
        self.client = httpx.AsyncClient(timeout=180)

    async def close(self):
        await self.client.aclose()

    async def chat(self, model, prompt, system='You are a writing assistant.'):
        if not API_KEY:
            raise RuntimeError('Missing OPENROUTER_API_KEY')

        models = list(model) if isinstance(model, (list, tuple)) else [model]
        last_error = None

        for candidate in models:
            await self.limiter.acquire()
            try:
                response = await self.client.post(
                    BASE_URL,
                    headers={
                        'Authorization': f'Bearer {API_KEY}',
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://localhost',
                        'X-Title': 'OpenRouter Book Factory Framework'
                    },
                    json={
                        'model': candidate,
                        'messages': [
                            {'role': 'system', 'content': system},
                            {'role': 'user', 'content': prompt}
                        ]
                    }
                )
                response.raise_for_status()
                try:
                    payload = response.json()
                    content = payload['choices'][0]['message']['content']
                    if not content:
                        raise ValueError('empty or null content')
                    return content
                except (json.JSONDecodeError, KeyError, IndexError, ValueError) as error:
                    print(f'  [bad-response] {candidate} — {error}, switching to next model')
                    last_error = error
                    continue
            except httpx.HTTPStatusError as error:
                print(f'  [error {error.response.status_code}] {candidate} — switching to next model')
                last_error = error
                continue
            except httpx.HTTPError as error:
                print(f'  [network-error] {candidate} — {error}, switching to next model')
                last_error = error
                continue

        if last_error:
            raise last_error
        raise RuntimeError('OpenRouter request failed without a specific error')


@dataclass
class BookJob:
    job_id: str
    premise: str
    status: str = 'new'
    current_chapter: int = 0
    score: float = 0.0
    memory: dict = field(default_factory=dict)
    template: str = 'fantasy.yaml'


class Storage:
    async def init(self):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute('CREATE TABLE IF NOT EXISTS jobs (job_id TEXT PRIMARY KEY, data TEXT)')
            await db.commit()

    async def save(self, job):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute('REPLACE INTO jobs VALUES (?,?)', (job.job_id, json.dumps(asdict(job))))
            await db.commit()

    async def load(self, job_id):
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute('SELECT data FROM jobs WHERE job_id=?', (job_id,))
            row = await cursor.fetchone()
            return BookJob(**json.loads(row[0])) if row else None

    async def all_jobs(self):
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute('SELECT data FROM jobs')
            rows = await cursor.fetchall()
            return [BookJob(**json.loads(row[0])) for row in rows]


class Factory:
    def __init__(self):
        self.store = Storage()
        self.client = OpenRouterClient(RateLimiter())

    async def close(self):
        await self.client.close()

    def resolve_template_path(self, name):
        template_name = Path(name or DEFAULT_TEMPLATE.name)
        if template_name.is_absolute() or '..' in template_name.parts:
            raise ValueError('Invalid template name')

        template_path = (TEMPLATES / template_name).resolve()
        templates_root = TEMPLATES.resolve()

        try:
            template_path.relative_to(templates_root)
        except ValueError as error:
            raise ValueError('Template path must stay inside the templates directory') from error

        if not template_path.is_file():
            raise FileNotFoundError(f'Template not found: {template_name}')

        return template_path

    def load_template(self, name):
        return yaml.safe_load(self.resolve_template_path(name).read_text(encoding='utf-8'))

    def available_templates(self):
        return sorted(path.name for path in TEMPLATES.glob('*.yaml') if path.is_file())

    async def ensure_unique_job_id(self, job_id):
        normalized = sanitize_job_id(job_id)
        if await self.store.load(normalized) or (BOOKS_DIR / normalized / f'{normalized}_outline.md').exists():
            return sanitize_job_id(f'{normalized}_{int(time.time())}')
        return normalized

    def chapter_files(self, job_id, language='en'):
        expected_suffix = language_file_suffix(language)
        chapter_files = []
        book_dir = BOOKS_DIR / str(job_id)
        if not book_dir.exists():
            return []

        for chapter_file in book_dir.glob(f'{job_id}_chapter_*.md'):
            match = CHAPTER_FILE_RE.match(chapter_file.name)
            if not match or match.group('job_id') != job_id:
                continue
            if (match.group('suffix') or '') != expected_suffix:
                continue
            chapter_files.append(chapter_file)
        return sorted(chapter_files, key=chapter_file_sort_key)

    async def ask(self, role, prompt):
        return await self.client.chat(MODELS[role], prompt)

    async def invent_book_job(self, seed=''):
        fallback = {
            'premise': seed.strip() or 'A hidden archive begins rewriting the memories of anyone who reads its lost maps.',
            'job_id': f'book_{int(time.time())}',
            'template_name': DEFAULT_TEMPLATE.name
        }
        available_templates = self.available_templates()
        prompt = (
            'Invent a fresh original book setup for this production pipeline.\n'
            f'Available templates: {", ".join(available_templates)}\n'
            f'Optional user seed: {seed.strip() or "none"}\n'
            'Return JSON only with these keys: premise, job_id, template_name.\n'
            'Rules:\n'
            '- premise must be 1 or 2 vivid sentences\n'
            '- job_id must be short, lowercase, and use underscores only\n'
            '- template_name must exactly match one available template'
        )
        invented = extract_json_object(await self.ask('inventor', prompt), fallback)
        premise = str(invented.get('premise') or fallback['premise']).strip()
        template_name = str(invented.get('template_name') or fallback['template_name']).strip()
        if template_name not in available_templates:
            template_name = fallback['template_name']

        job_id_source = invented.get('job_id') or premise or fallback['job_id']
        job_id = await self.ensure_unique_job_id(job_id_source)
        return {'premise': premise, 'job_id': job_id, 'template_name': template_name}

    def retrieve_relevant(self, job, query, topk=3):
        query_vector = embed_text(query)
        memories = job.memory.get('scene_vectors', [])
        scored = sorted(memories, key=lambda item: cosine(query_vector, item['vec']), reverse=True)[:topk]
        return '\n'.join(item['text'] for item in scored)

    async def check_characters(self, job, chapter_text):
        profile = json.dumps(job.memory.get('characters', {}), ensure_ascii=False)
        prompt = (
            f'Check character consistency. Known profiles: {profile}\n'
            f'Text: {chapter_text[:4000]}\n'
            'Return corrections only if inconsistent.'
        )
        return await self.ask('editor', prompt)

    async def style_fingerprint(self, job):
        samples = job.memory.get('style_samples', [])[-3:]
        if not samples:
            return ''
        joined = '\n'.join(samples)
        prompt = f'Extract concise style fingerprint (syntax, rhythm, tone) from:\n{joined}'
        return await self.ask('planner', prompt)

    async def plan(self, job):
        template = yaml.safe_dump(self.load_template(job.template), sort_keys=False)
        return await self.ask('planner', f'Template:\n{template}\nCreate 10 chapter outline for {job.premise}')

    async def chapter_variants(self, job, outline, chapter_number):
        template = yaml.safe_dump(self.load_template(job.template), sort_keys=False)
        memory = json.dumps(job.memory, ensure_ascii=False)
        relevant = self.retrieve_relevant(job, f'chapter {chapter_number} {job.premise}')
        style = await self.style_fingerprint(job)
        prompt = (
            f'Template:\n{template}\n'
            f'Premise: {job.premise}\n'
            f'Memory: {memory}\n'
            f'RelevantScenes: {relevant}\n'
            f'StyleFingerprint: {style}\n'
            f'Outline: {outline}\n'
            f'Write chapter {chapter_number}.'
        )
        version_a = await self.ask('writer', f'{prompt}\nVersion A')
        version_b = await self.ask('writer', f'{prompt}\nVersion B')
        return version_a, version_b

    async def edit(self, text):
        return await self.ask('editor', f'Edit:\n{text}')

    async def score(self, text):
        output = await self.ask('scorer', f'Score 0-10 only:\n{text[:4000]}')
        try:
            return float(output.split()[0].replace(',', '.'))
        except Exception:
            return 5.0

    async def summarize_memory(self, text):
        output = await self.ask('planner', f'Extract JSON with events, characters, open_threads:\n{text[:5000]}')
        return extract_json_object(output, {'events': [], 'characters': {}, 'open_threads': []})

    async def translate_text_to_italian(self, text, label):
        prompt = (
            f'Translate the following {label} into natural Italian.\n'
            'Preserve Markdown structure, headings, bullet lists, numbered lists, tables, and HTML comments.\n'
            'Keep the separator <!-- consistency_check --> unchanged if present.\n'
            'Return only the translated text.\n'
            f'Text:\n{text}'
        )
        return await self.ask('translator', prompt)

    async def translate_book_to_italian(self, job):
        bd = book_subdir(job.job_id)
        outline_path = bd / f'{job.job_id}_outline.md'
        if outline_path.exists():
            translated_outline = await self.translate_text_to_italian(
                outline_path.read_text(encoding='utf-8'),
                f'outline for {job.job_id}'
            )
            (bd / f'{job.job_id}_outline_it.md').write_text(translated_outline, encoding='utf-8')

        for chapter_file in self.chapter_files(job.job_id):
            translated_text = await self.translate_text_to_italian(
                chapter_file.read_text(encoding='utf-8'),
                chapter_file.stem
            )
            (chapter_file.parent / f'{chapter_file.stem}_it.md').write_text(translated_text, encoding='utf-8')

        self.export_epub(job.job_id, language='it')
        self.export_pdf(job.job_id, language='it')

    def export_epub(self, job_id, language='en'):
        output_stem = f'{job_id}{language_file_suffix(language)}'
        book = epub.EpubBook()
        book.set_identifier(output_stem)
        book.set_title(output_stem)
        book.set_language(language)

        spine = ['nav']
        toc = []
        for chapter_file in self.chapter_files(job_id, language):
            chapter = epub.EpubHtml(title=chapter_file.stem, file_name=chapter_file.name.replace('.md', '.xhtml'))
            chapter.content = chapter_file.read_text(encoding='utf-8').replace('\n', '<br/>')
            book.add_item(chapter)
            toc.append(chapter)
            spine.append(chapter)

        book.toc = tuple(toc)
        book.spine = spine
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        bd = book_subdir(job_id)
        epub.write_epub(str(bd / f'{output_stem}.epub'), book)

    def export_pdf(self, job_id, language='en'):
        output_stem = f'{job_id}{language_file_suffix(language)}'
        bd = book_subdir(job_id)
        document = SimpleDocTemplate(str(bd / f'{output_stem}.pdf'))
        styles = getSampleStyleSheet()
        story = []
        for chapter_file in self.chapter_files(job_id, language):
            story.append(Paragraph(chapter_file.stem, styles['Heading2']))
            story.append(Spacer(1, 8))
            story.extend(markdown_story_for_pdf(chapter_file.read_text(encoding='utf-8'), styles))
            story.append(Spacer(1, 12))
        document.build(story)

    async def run_job(self, job):
        bd = book_subdir(job.job_id)
        outline_path = bd / f'{job.job_id}_outline.md'
        outline = outline_path.read_text(encoding='utf-8') if outline_path.exists() else await self.plan(job)
        outline_path.write_text(outline, encoding='utf-8')

        for chapter_number in range(job.current_chapter + 1, 11):
            draft_a, draft_b = await self.chapter_variants(job, outline, chapter_number)
            edited_a, edited_b = await asyncio.gather(self.edit(draft_a), self.edit(draft_b))
            score_a, score_b = await asyncio.gather(self.score(edited_a), self.score(edited_b))

            chosen_text = edited_a if score_a >= score_b else edited_b
            job.score = max(score_a, score_b)

            summary = await self.summarize_memory(chosen_text)
            consistency_check = await self.check_characters(job, chosen_text)
            final_text = chosen_text
            if consistency_check.strip():
                final_text = f'{chosen_text}\n\n<!-- consistency_check -->\n{consistency_check}'

            (bd / f'{job.job_id}_chapter_{chapter_number}.md').write_text(final_text, encoding='utf-8')

            merge_summary_into_memory(job.memory, summary)
            job.memory.setdefault('scene_vectors', []).append({
                'text': final_text[:1200],
                'vec': embed_text(final_text[:1200])
            })
            job.memory.setdefault('style_samples', []).append(final_text[:2000])

            job.current_chapter = chapter_number
            job.status = 'running'
            await self.store.save(job)

        self.export_epub(job.job_id)
        self.export_pdf(job.job_id)
        await self.translate_book_to_italian(job)
        job.status = 'done'
        await self.store.save(job)


class Scheduler:
    async def run(self):
        factory = Factory()
        await factory.store.init()
        try:
            pending_jobs = [job for job in await factory.store.all_jobs() if job.status != 'done']
            if not pending_jobs:
                print('No pending jobs to resume.')
                return

            for job in pending_jobs:
                await factory.run_job(job)
        finally:
            await factory.close()


def generate_dashboard():
    db_file = DB_PATH
    html = [
        '<html><head><title>Book Dashboard</title><style>body{font-family:Arial;margin:30px}'
        'table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}'
        'th{background:#eee}</style></head><body><h1>Book Factory Dashboard</h1>'
        '<table><tr><th>Job</th><th>Status</th><th>Chapter</th><th>Score</th></tr>'
    ]
    if db_file.exists():
        import sqlite3

        connection = sqlite3.connect(db_file)
        rows = connection.execute('SELECT data FROM jobs').fetchall()
        for row in rows:
            data = json.loads(row[0])
            html.append(
                f"<tr><td>{data['job_id']}</td><td>{data['status']}</td>"
                f"<td>{data['current_chapter']}</td><td>{data['score']}</td></tr>"
            )
        connection.close()
    html.append('</table></body></html>')
    path = BOOKS_DIR / 'dashboard.html'
    path.write_text(''.join(html), encoding='utf-8')
    return path


def start_dashboard_server():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            dashboard_path = generate_dashboard()
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(dashboard_path.read_bytes())

    server = HTTPServer(('localhost', 8080), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print('Dashboard: http://localhost:8080')


async def main():
    start_dashboard_server()
    mode = input('new: ').strip() or 'new'

    if mode == 'new':
        factory = Factory()
        await factory.store.init()
        try:
            idea_seed = input('Idea seed [auto]: ')
            invented = await factory.invent_book_job(idea_seed)
            premise = input(f"Premise [{invented['premise']}]: ").strip() or invented['premise']
            requested_job_id = input(f"Job id [{invented['job_id']}]: ").strip() or invented['job_id']
            template_name = input(f"Template [{invented['template_name']}]: ").strip() or invented['template_name']
            job_id = await factory.ensure_unique_job_id(requested_job_id)
            print(f'Using job id: {job_id}')
            factory.load_template(template_name)
            job = BookJob(job_id=job_id, premise=premise, template=template_name)
            await factory.store.save(job)
            await factory.run_job(job)
        finally:
            await factory.close()
    else:
        await Scheduler().run()


if __name__ == '__main__':
    asyncio.run(main())
