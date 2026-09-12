/**
 * @file
 *
 * Produces the mobile screenshots the community-store listing needs
 * (T461-P21), driving a staged note in Obsidian Mobile on a real Android
 * emulator and writing `images/screenshots/screenshot-mobile-N.png`.
 *
 * TWO shots, the same two the desktop suite takes, and for the same reason: a
 * stale render cannot be staged from inside Obsidian, on either platform. Both
 * write paths reach Obsidian's own file watcher, which re-renders the view
 * before anything can be photographed, so the set shows the plugin's SURFACE —
 * the commands it registers and the button it adds to every view — rather than
 * a faked before/after.
 *
 * What the mobile set adds over the desktop one is that both are reachable on a
 * phone at all. The plugin gates nothing on `Platform`, and these frames are
 * what proves it: a reader deciding whether it is worth installing on their
 * phone can see its palette entries and its button on a phone screen.
 *
 * There is no mobile equivalent of the desktop viewport override, so the AVD is
 * built at exactly 900x1600 — see [[T461-P21]] for its one-time provisioning.
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
  captureDeviceScreenshot,
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  raiseSoftKeyboard,
  readPngDimensions,
  resolveEmulatorDeviceId,
  withSoftKeyboardEnabled
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

/**
 * `App`, reduced to the font-size applier that `obsidian-typings` does not
 * declare. Setting `baseFontSize` alone changes nothing on screen.
 */
interface FontSizeApp {
  updateFontSize(this: void): void;
}

/**
 * `App`, reduced to the inline-title toggle that `obsidian-typings` does not
 * declare. Setting the config alone changes nothing on screen.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

/**
 * What the button probe reports back, so a shot can assert the button is on
 * screen before it is photographed.
 */
interface RefreshButtonProbe {
  hasButton: boolean;
  hasOpenPrompt: boolean;
  label: null | string;
}

/**
 * The plugin's manifest id, which does NOT match the repository name.
 */
const PLUGIN_ID = 'refresh-preview';

const WIDTH_IN_PIXELS = 900;
const HEIGHT_IN_PIXELS = 1600;

/**
 * Base font size for the mobile shots, below the 16px default so the command
 * palette's entries fit one line each on a 450dp screen.
 */
const MOBILE_FONT_SIZE_IN_PIXELS = 13;

const SUBJECT_NOTE_PATH = 'Screenshots/Dashboard.md';

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

/**
 * The AVD the frames are taken on, matched by name.
 *
 * Never the first device `adb devices` lists: a physical phone is routinely plugged into the same
 * machine, and the shared AVD the cross-platform suites drive is a different size.
 */
const AVD_NAME = 'obsidian_screenshots';

/**
 * Obsidian's command palette input, read off this suite's own palette helper rather than assumed: the
 * palette renders `.prompt input`, which is not the `.prompt-input` a suggester renders.
 */
const PALETTE_INPUT_SELECTOR = '.prompt input';

let deviceId = '';

beforeAll(async () => {
  deviceId = await resolveEmulatorDeviceId({ avdName: AVD_NAME });

  const vault = getTemporaryVault();

  vault.populate({ [SUBJECT_NOTE_PATH]: buildSubjectNote() });
  await vault.syncToDevice();

  await evalInObsidian({
    async callback({ app, fontSizeInPixels, lib: { waitUntil }, subjectNotePath }) {
      // A closure runs inside ONE Appium execute/sync call, which WebDriver caps
      // Around 30s, so every wait in here stays comfortably under it.
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');

      await waitUntil({
        message: 'the staged note to appear in the vault',
        predicate: () => Boolean(app.vault.getFileByPath(subjectNotePath)),
        timeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS
      });

      // Otherwise the frame carries the note's title twice: once as the inline
      // Title Obsidian renders above it, once as its own `# Dashboard`.
      app.vault.setConfig('showInlineTitle', false);
      const inlineTitleApp: unknown = app;
      (inlineTitleApp as InlineTitleApp).updateInlineTitleDisplay();

      app.vault.setConfig('baseFontSize', fontSizeInPixels);
      const fontApp: unknown = app;
      (fontApp as FontSizeApp).updateFontSize();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    input: { fontSizeInPixels: MOBILE_FONT_SIZE_IN_PIXELS, subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
});

describe('mobile store screenshots', () => {
  it('1 - the commands it registers', async () => {
    const commandNames = await openCommandPalette('Refresh');
    expect(commandNames.length).toBeGreaterThan(1);
    await shootWithSoftKeyboard(1, 'Refresh this view, the visible ones, or every open tab');
  });

  it('2 - the button the plugin adds to every view', async () => {
    // Second, because the button is a small icon in the corner and the frame
    // Leans on its caption to point at it. A phone has no hover, so unlike the
    // Desktop set there is no tooltip to raise beside it.
    const probe = await findRefreshButton();
    expect(probe).toMatchObject({ hasButton: true, hasOpenPrompt: false });
    await shoot(2, 'And a refresh button in every view, top right');
  });
});

/**
 * Builds the note the shots are framed on.
 *
 * @returns The note's Markdown.
 */
function buildSubjectNote(): string {
  // One paragraph per line, unlike the desktop suite's hard-wrapped copy: at
  // 450dp those wraps land mid-sentence and the note reads as ragged columns.
  return '# Dashboard\n\n'
    + 'A note whose content is generated when the view renders — a query result, an embedded note, '
    + 'output from another plugin, or simply the time it was last built.\n\n'
    + 'Reading: 12 units, taken at 09:00\n';
}

/**
 * Opens the staged note in reading view and locates the toolbar button the
 * plugin adds to it.
 *
 * @returns Whether the button is on screen, and the label it carries.
 */
async function findRefreshButton(): Promise<RefreshButtonProbe> {
  return await evalInObsidian({
    async callback({ app, lib: { pressKey, waitUntil }, subjectNotePath }) {
      /*
       * Under the transport's ~30s per-closure cap, not at it.
       * Two waits and two settles share this one budget, so at 20_000 apiece the closure declared 43.5s.
       * The eval is killed at the cap first and reported as a bare transport timeout.
       * That names the harness rather than the wait that overran.
       * A view re-rendering lands in well under a second, so the smaller ceiling costs nothing.
       */
      const RENDER_TIMEOUT_IN_MILLISECONDS = 10_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;

      // Let the previous shot's capture settle: the device-metrics override it
      // Sets and clears disturbs anything driven too soon afterwards.
      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

      // The palette shot 1 opened is STILL OPEN, and it covers the whole screen
      // On a phone — without this the frame is that palette again, captioned as
      // Though it were the note.
      await pressKey({ key: 'Escape' });

      await waitUntil({
        message: 'the command palette to close',
        predicate: () => !document.querySelector('.prompt'),
        timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS
      });

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

      // Obsidian keeps a view's earlier header in the document at zero size, so
      // A query can hand back an invisible copy of the button: the assertion
      // Would pass against something the frame does not show.
      function isOnScreen(element: Element): boolean {
        return element.getBoundingClientRect().width > 0;
      }

      function findButton(): Element | undefined {
        return [...document.querySelectorAll('.view-actions .clickable-icon')]
          .find((candidate) => (candidate.getAttribute('aria-label') ?? '').toLowerCase().includes('refresh') && isOnScreen(candidate));
      }

      // Waiting for the PLUGIN'S button, not merely for the toolbar: the plugin
      // Adds its icon a moment after the view renders, and looking before that
      // Finds an empty-handed toolbar and reports the button missing.
      await waitUntil({
        message: 'the refresh button to be added to the toolbar',
        predicate: () => Boolean(findButton()),
        timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS
      });

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      // Found by the label Obsidian puts on it rather than by icon class: the
      // Icon is a lucide name that a version bump can rename, while the label is
      // The plugin's own and is what a reader recognizes.
      const button = findButton();

      return {
        hasButton: Boolean(button),
        // Reported so the shot FAILS rather than quietly photographing an
        // Overlay left behind by the shot before it.
        hasOpenPrompt: Boolean(document.querySelector('.prompt')),
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
 * @returns The plugin's own command names.
 */
async function openCommandPalette(query: string): Promise<string[]> {
  return await evalInObsidian({
    async callback({ app, lib: { waitUntil }, pluginId, query: text, subjectNotePath }) {
      const PALETTE_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 900;

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
 * `images/screenshots/screenshot-mobile-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const captured = await captureObsidianScreenshot({ vaultPath: vaultPath() });

  await writeFrame(index, caption, captured);
}

/**
 * Raises the soft keyboard, captures the DEVICE, and writes the frame.
 *
 * For a shot whose subject is a focused field. `captureObsidianScreenshot` cannot show a keyboard: it
 * drives Appium in the WebView context, so it photographs the page, and the IME is a system window that
 * is not part of the page — which left such a frame as a field over a large empty band, with the caption
 * band landing on the field and clipping the typed text.
 *
 * Two things are needed and both belong to the harness rather than here: the AVD is built with a hardware
 * keyboard attached, so Android suppresses the on-screen one until `withSoftKeyboardEnabled` lifts that
 * and puts the setting back exactly — including putting back a setting that had never been written, which
 * takes a delete rather than a write; and a WebView will not ask for an IME on programmatic focus alone,
 * so `raiseSoftKeyboard` lands a real touch on the field and then proves geometrically that it lifted,
 * because nothing in the page reports the keyboard.
 *
 * The trade, which applies only to the shots that switch: a device capture is **not** byte-reproducible,
 * because the status-bar clock and the battery indicator are in it. A shot with no focused field keeps
 * {@link shoot} and stays reproducible — a real phone shows no keyboard there either, so raising one
 * would make that frame less true rather than more.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shootWithSoftKeyboard(index: number, caption: string): Promise<void> {
  const captured = await withSoftKeyboardEnabled({
    async callback() {
      await raiseSoftKeyboard({
        deviceId,
        inputSelector: PALETTE_INPUT_SELECTOR,
        vaultPath: vaultPath()
      });

      return await captureDeviceScreenshot({ deviceId });
    },
    deviceId
  });

  await writeFrame(index, caption, captured);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

/**
 * Asserts the frame is the store size, captions it, and writes it out.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 * @param captured - The raw PNG, from either capture route.
 */
async function writeFrame(index: number, caption: string, captured: Uint8Array): Promise<void> {
  // The AVD is 900x1600, so the device frame IS the store size. Asserting it
  // Here is what keeps that true: run this against any other AVD and it fails
  // Loudly instead of quietly shipping an off-spec image.
  expect(readPngDimensions(captured)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(captured, { text: caption });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-mobile-${String(index)}.png`), labeled);
}
