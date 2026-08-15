/**
 * @file
 *
 * Produces the desktop screenshots the community-store listing needs
 * (T461-P21), driving a staged note in a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`.
 *
 * TWO shots. This plugin's subject is a NEGATIVE — a view that failed to update
 * — and a stale render cannot be staged from inside Obsidian at all: rewriting
 * the open note through `Vault.modify` OR through the vault adapter both reach
 * Obsidian's own file watcher, which re-renders the view before anything can be
 * photographed. A frame captioned "this view is stale" that is in fact showing a
 * freshly re-rendered view would be a lie, so the set shows the plugin's SURFACE
 * instead: the commands it registers, and the button it adds to every view.
 *
 * The shot count is a ceiling rather than a quota, and two honest frames beat
 * five with a staged lie among them.
 *
 * Note the plugin id is `refresh-preview`, not `refresh-any-view` — the repo and
 * the display name were renamed and the id was not. Using the repo name here
 * makes every `executeCommandById` silently return false.
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

/**
 * `App`, reduced to the inline-title toggle that `obsidian-typings` does not
 * declare. Setting the config alone changes nothing on screen.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

/**
 * The desktop side dock, reduced to the resize call.
 */
interface ResizableSideDock {
  setSize(this: void, size: number): void;
}

/**
 * The plugin's manifest id, which does NOT match the repository name.
 */
const PLUGIN_ID = 'refresh-preview';

const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

const SUBJECT_NOTE_PATH = 'Screenshots/Dashboard.md';

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  const vault = getTemporaryVault();

  vault.populate({ [SUBJECT_NOTE_PATH]: buildSubjectNote() });
  await vault.syncToDevice();

  await evalInObsidian({
    async callback({ app, lib: { waitUntil }, subjectNotePath }) {
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 30_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');

      await waitUntil({
        message: 'the staged note to appear in the vault',
        predicate: () => Boolean(app.vault.getFileByPath(subjectNotePath)),
        timeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS
      });

      // The note is the subject; the file explorer and an empty right dock would
      // Otherwise take a third of a 1200x800 frame.
      app.workspace.leftSplit.collapse();
      const rightSplit: unknown = app.workspace.rightSplit;
      (rightSplit as ResizableSideDock).setSize(0);
      app.workspace.rightSplit.collapse();

      app.vault.setConfig('showInlineTitle', false);
      const inlineTitleApp: unknown = app;
      (inlineTitleApp as InlineTitleApp).updateInlineTitleDisplay();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    input: { subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
});

describe('desktop store screenshots', () => {
  it('1 - the commands it registers', async () => {
    const commandNames = await openCommandPalette('Refresh');
    expect(commandNames.length).toBeGreaterThan(1);
    await shoot(1, 'Refresh this view, the visible ones, or every open tab');
  });

  it('2 - the button the plugin adds to every view', async () => {
    // Second, because the button is a small icon in the corner and the frame
    // Leans on its caption to point at it. Obsidian raises its tooltips from its
    // Own hover handling, which a dispatched hover does not wake, so there is no
    // Label in frame to carry it.
    const probe = await hoverRefreshButton();
    expect(probe).toMatchObject({ hasButton: true });
    await shoot(2, 'And a refresh button in every view, top right');
  });
});

/**
 * Builds the note the shots are framed on.
 *
 * @returns The note's Markdown.
 */
function buildSubjectNote(): string {
  return '# Dashboard\n\n'
    + 'A note whose content is generated when the view renders — a query result, an\n'
    + 'embedded note, output from another plugin, or simply the time it was last\n'
    + 'built.\n\n'
    + 'Reading: 12 units, taken at 09:00\n';
}

/**
 * Opens the staged note and hovers the toolbar button the plugin adds, so the
 * frame carries the tooltip that names it.
 *
 * @returns Whether the button was found.
 */
async function hoverRefreshButton(): Promise<unknown> {
  return await evalInObsidian({
    async callback({ app, lib: { hoverElement, waitUntil }, subjectNotePath }) {
      const RENDER_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;

      const file = app.vault.getFileByPath(subjectNotePath);
      if (!file) {
        throw new Error(`Note is missing from the vault: ${subjectNotePath}`);
      }

      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: 'preview', source: false },
        type: 'markdown'
      });

      // Waiting for the PLUGIN'S button, not merely for the toolbar: the plugin
      // Adds its icon a moment after the view renders, and looking before that
      // Found an empty-handed toolbar and reported the button missing.
      await waitUntil({
        message: 'the refresh button to be added to the toolbar',
        predicate: () =>
          [...document.querySelectorAll('.view-actions .clickable-icon')]
            .some((candidate) => (candidate.getAttribute('aria-label') ?? '').toLowerCase().includes('refresh')),
        timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS
      });

      // Found by the tooltip Obsidian puts on it rather than by icon class: the
      // Icon is a lucide name that a version bump can rename, while the label is
      // The plugin's own and is what a reader recognizes.
      const button = [...document.querySelectorAll('.view-actions .clickable-icon')]
        .find((candidate) => (candidate.getAttribute('aria-label') ?? '').toLowerCase().includes('refresh'));

      if (button instanceof HTMLElement) {
        await hoverElement({ element: button });
      }

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return {
        hasButton: button instanceof HTMLElement,
        label: button?.getAttribute('aria-label') ?? null
      };
    },
    input: { subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
}

/**
 * Opens the command palette and filters it to this plugin's commands.
 *
 * @param query - What to type into the palette.
 * @returns The command names left on screen.
 */
async function openCommandPalette(query: string): Promise<string[]> {
  return await evalInObsidian({
    async callback({ app, lib: { waitUntil }, pluginId, query: text, subjectNotePath }) {
      const PALETTE_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 900;
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;

      // Let the previous shot's capture settle: the device-metrics override it
      // Sets and clears tears down anything opened too soon afterwards.
      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

      // Over the note rather than an empty tab: the palette is the subject, but
      // A frame of it floating above 'New tab' looks like a fresh install.
      const file = app.vault.getFileByPath(subjectNotePath);
      if (file) {
        await app.workspace.getLeaf(false).openFile(file);
      }

      app.commands.executeCommandById('command-palette:open');

      await waitUntil({
        message: 'the command palette to open',
        predicate: () => Boolean(document.querySelector('.prompt input')),
        timeoutInMilliseconds: PALETTE_TIMEOUT_IN_MILLISECONDS
      });

      const input = document.querySelector('.prompt input');
      if (!(input instanceof HTMLInputElement)) {
        throw new TypeError('The command palette has no input.');
      }

      input.value = text;
      // The palette filters from its own `input` handler, so setting `value`
      // Alone would leave every command in the vault on screen.
      input.dispatchEvent(new Event('input'));

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      // Reported so the shot can assert the plugin's own commands are the ones
      // On screen, rather than whatever else matched the word.
      return Object.values(app.commands.commands)
        .filter((command) => command.id.startsWith(`${pluginId}:`))
        .map((command) => command.name);
    },
    input: { pluginId: PLUGIN_ID, query, subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
}

/**
 * Captures the window, captions it, and writes it as
 * `images/screenshots/screenshot-desktop-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({
    heightInPixels: HEIGHT_IN_PIXELS,
    vaultPath: vaultPath(),
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
