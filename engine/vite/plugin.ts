/**
 * The bridge between human/ and the app.
 *
 * - `virtual:mtree/content` is the parsed content, baked into production builds.
 * - In dev, any change under human/ is re-parsed and pushed to the browser
 *   (event "mtree:content"), so edits show up without a reload.
 * - In dev, a small JSON API lets the app write reading notes back into
 *   human/library/*.md. Nothing else is ever written.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { loadContent, HUMAN_DIR } from '../content/load.ts';
import { addHighlight, paperIdFrom, paperTemplate, removeLine, setFact, setSection } from '../content/edit.ts';
import { fetchArxiv, formatAuthors } from '../content/arxiv.ts';
import { arxivIdFrom } from '../content/deeplinks.ts';
import { parseHighlight } from '../content/parse.ts';
import { STATUSES, type Content } from '../content/types.ts';

const VIRTUAL = 'virtual:mtree/content';
const RESOLVED = '\0' + VIRTUAL;
const ID = /^[a-z0-9][a-z0-9-]*$/;

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

const today = () => new Date().toISOString().slice(0, 10);

export function mtree(): Plugin {
  let root = process.cwd();
  let content: Content;
  let server: ViteDevServer | undefined;

  const reload = () => {
    content = loadContent(root);
    return content;
  };

  const push = () => {
    if (!server) return;
    const mod = server.moduleGraph.getModuleById(RESOLVED);
    if (mod) server.moduleGraph.invalidateModule(mod);
    server.ws.send({ type: 'custom', event: 'mtree:content', data: reload() });
  };

  const libraryFile = (id: string) => path.join(root, HUMAN_DIR, 'library', `${id}.md`);

  return {
    name: 'mtree-content',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED;
    },
    load(id) {
      if (id !== RESOLVED) return;
      const c = reload();
      for (const d of c.diagnostics.filter((x) => x.level === 'error')) this.warn(`${d.file}:${d.line}  ${d.message}`);
      return `export default ${JSON.stringify(c)};`;
    },
    handleHotUpdate(ctx) {
      const rel = path.relative(root, ctx.file);
      if (rel.startsWith(HUMAN_DIR + path.sep) && rel.endsWith('.md')) {
        push();
        return [];
      }
    },
    configureServer(s) {
      server = s;
      // New and deleted files do not go through handleHotUpdate.
      const onAddRemove = (file: string) => {
        const rel = path.relative(root, file);
        if (rel.startsWith(HUMAN_DIR + path.sep) && rel.endsWith('.md')) push();
      };
      s.watcher.on('add', onAddRemove);
      s.watcher.on('unlink', onAddRemove);

      s.middlewares.use('/__mtree', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        // Only the app itself may write: JSON bodies (which force a CORS preflight)
        // from a page served by this same dev server.
        const origin = req.headers.origin;
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json') || (origin && new URL(origin).host !== req.headers.host)) {
          return send(res, 403, { ok: false, error: 'Writes are only accepted from the app on this dev server.' });
        }
        try {
          const url = new URL(req.url ?? '/', 'http://local');
          const body = await readBody(req);

          // Create a paper from an arXiv link/id, or from a title + url.
          if (url.pathname === '/paper') {
            const taken = new Set(fs.readdirSync(path.join(root, HUMAN_DIR, 'library')).map((f) => f.replace(/\.md$/, '')));
            const input = String(body.input ?? '').trim();
            const arxiv = arxivIdFrom(input).replace(/v\d+$/, '');
            if (arxiv) {
              const existing = reload().papers.find((p) => p.arxiv.replace(/v\d+$/, '') === arxiv);
              if (existing) return send(res, 200, { ok: true, id: existing.id, existed: true });
              const meta = await fetchArxiv(arxiv);
              const id = body.id && ID.test(body.id) && !taken.has(body.id) ? body.id : paperIdFrom(meta.title, taken, meta.authors[0], meta.published.slice(-4));
              fs.writeFileSync(
                libraryFile(id),
                paperTemplate({ title: meta.title, authors: formatAuthors(meta.authors), published: meta.published, type: 'paper', arxiv, status: 'to read', added: today() }),
              );
              push();
              return send(res, 200, { ok: true, id });
            }
            const title = String(body.title ?? '').trim();
            if (!title || !/^https?:\/\//.test(input)) return send(res, 400, { ok: false, error: 'Paste an arXiv link or id, or a title and a URL.' });
            const id = paperIdFrom(title, taken);
            fs.writeFileSync(libraryFile(id), paperTemplate({ title, url: input, type: 'post', status: 'to read', added: today() }));
            push();
            return send(res, 200, { ok: true, id });
          }

          // Update one paper's notes, status or highlights.
          const m = /^\/paper\/([^/]+)$/.exec(url.pathname);
          if (m) {
            const id = decodeURIComponent(m[1]);
            if (!ID.test(id) || !fs.existsSync(libraryFile(id))) return send(res, 404, { ok: false, error: `No paper "${id}".` });
            let text = fs.readFileSync(libraryFile(id), 'utf8');
            if (typeof body.status === 'string') {
              if (body.status && !STATUSES.includes(body.status)) return send(res, 400, { ok: false, error: 'Unknown status.' });
              text = setFact(text, 'status', body.status);
            }
            if (typeof body.notes === 'string') text = setSection(text, 'Notes', body.notes, 'Highlights');
            if (body.highlight && typeof body.highlight === 'object') {
              const h = { locator: String(body.highlight.locator ?? ''), quote: String(body.highlight.quote ?? ''), comment: String(body.highlight.comment ?? '') };
              if (!h.locator && !h.quote && !h.comment) return send(res, 400, { ok: false, error: 'An empty highlight.' });
              text = addHighlight(text, h);
            }
            if (body.removeHighlight && typeof body.removeHighlight === 'object') {
              // Remove by line, but only if that line still holds the highlight the app showed.
              const { line, locator = '', quote = '', comment = '' } = body.removeHighlight;
              const current = parseHighlight(text.replace(/\r\n?/g, '\n').split('\n')[Number(line) - 1] ?? '', '', 0);
              if (!current || current.locator !== locator || current.quote !== quote || current.comment !== comment) {
                return send(res, 409, { ok: false, error: 'The file changed since the page loaded; nothing was removed.' });
              }
              text = removeLine(text, Number(line));
            }
            fs.writeFileSync(libraryFile(id), text);
            push();
            return send(res, 200, { ok: true, id });
          }
          next();
        } catch (e) {
          send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      });
    },
  };
}
