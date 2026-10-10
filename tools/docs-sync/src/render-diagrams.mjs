#!/usr/bin/env node
import { readdir, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repositoryRoot = path.resolve(process.argv[2] || '.');
const sourceDirectory = path.join(repositoryRoot, 'docs/manuals/mermaid');
const outputDirectory = path.join(repositoryRoot, 'docs/manuals/assets/diagrams');
const mermaidEntry = fileURLToPath(import.meta.resolve('mermaid'));
const mermaidBundle = path.join(path.dirname(mermaidEntry), 'mermaid.min.js');

await mkdir(outputDirectory, { recursive: true });
const sources = (await readdir(sourceDirectory))
  .filter((name) => name.endsWith('.mmd'))
  .sort();

if (sources.length === 0) {
  throw new Error(`No Mermaid sources found in ${sourceDirectory}`);
}

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1400 },
    deviceScaleFactor: 2,
  });
  await page.setContent(`<!doctype html><html><head><style>
    html, body { margin: 0; background: white; }
    #diagram { display: inline-block; padding: 24px; background: white; }
    #diagram svg { max-width: 1700px; height: auto; }
  </style></head><body><main id="diagram"></main></body></html>`);
  await page.addScriptTag({ path: mermaidBundle });

  for (const sourceName of sources) {
    const source = await readFile(path.join(sourceDirectory, sourceName), 'utf8');
    await page.evaluate(async ({ definition, diagramId }) => {
      globalThis.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'neutral',
      });
      const { svg } = await globalThis.mermaid.render(diagramId, definition);
      document.querySelector('#diagram').innerHTML = svg;
    }, {
      definition: source,
      diagramId: `diagram-${sourceName.replace(/[^a-z0-9]/gi, '-')}`,
    });
    const outputName = sourceName.replace(/\.mmd$/, '.png');
    await page.locator('#diagram').screenshot({
      path: path.join(outputDirectory, outputName),
      animations: 'disabled',
    });
  }
} finally {
  await browser.close();
}

console.log(`Rendered ${sources.length} Mermaid diagrams into ${outputDirectory}`);
