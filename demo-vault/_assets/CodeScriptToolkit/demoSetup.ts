import type { App } from 'obsidian';

import { Notice } from 'obsidian';
import {
  configureCommunityPlugin,
  installConfigureEnableCommunityPlugin
} from '@mnaoumov/obsidian-lib/community-plugins';

// The plugin's manifest id is `refresh-preview`, not the repo name — commands and `data.json` are
// keyed by it.
const PLUGIN_ID = 'refresh-preview';
const DATAVIEW_PLUGIN_ID = 'dataview';
const DATAVIEW_PLUGIN_NAME = 'Dataview';

interface DemoSettingsPatch {
  autoRefreshIntervalInSeconds?: number;
  autoRefreshMode?: string;
  shouldAutoRefreshMarkdownViewInSourceMode?: boolean;
  shouldAutoRefreshOnFileChange?: boolean;
  shouldUseQuickMarkdownViewRefresh?: boolean;
}

/**
 * Applies a settings patch to the plugin.
 *
 * `configureCommunityPlugin` routes through the plugin's own `editAndSave` when it is loaded, so the
 * change applies live — no window reload, and no writing `data.json` behind a running plugin's back
 * (which it would overwrite from memory as it unloads).
 *
 * Manual equivalent: change the same setting in **Settings -> Community plugins -> Refresh Any View**.
 */
export async function changeSettings(app: App, patch: DemoSettingsPatch): Promise<void> {
  await configureCommunityPlugin({ app, pluginId: PLUGIN_ID, settings: patch });
  new Notice('Applied the setting. It is live — no reload needed.');
}

/**
 * Installs and enables `Dataview`, so this vault has some genuinely dynamic content to refresh.
 *
 * Without it the `dataviewjs` block below renders as a plain code fence and there is nothing stale to
 * fix — which is the one thing this plugin's demo actually needs and the vault could not ship, since
 * bundling another author's plugin is not ours to do.
 *
 * Manual equivalent: **Settings -> Community plugins -> Browse**, search for `Dataview`, install and
 * enable it.
 */
export async function installDataview(app: App): Promise<void> {
  new Notice(createPluginNameFragment('Installing ', '...'));
  await installConfigureEnableCommunityPlugin({ app, pluginId: DATAVIEW_PLUGIN_ID });
  new Notice(createPluginNameFragment('', ' is enabled. Switch this note to Reading mode to see a live timestamp.'));
}

/**
 * Opens a note in the active tab in **Reading** mode, where rendered content is what a refresh redraws.
 *
 * Manual equivalent: open the note, then switch it to Reading mode with the book icon in the view's
 * top-right toolbar, or **Toggle reading view** (`Ctrl`/`Cmd` + `E`).
 */
export async function openInReadingMode(app: App, notePath: string): Promise<void> {
  const file = app.vault.getFileByPath(notePath);
  if (!file) {
    new Notice(`Note not found: ${notePath}`);
    return;
  }
  await app.workspace.getLeaf(false).openFile(file, { active: true, state: { mode: 'preview' } });
}

/**
 * Runs the plugin's `Refresh active view` command.
 *
 * Manual equivalent: the circular-arrows button in the view's top-right toolbar, or
 * **Refresh Any View: Refresh active view** in the Command Palette.
 */
export function refreshActiveView(app: App): void {
  app.commands.executeCommandById(`${PLUGIN_ID}:refresh-active-view`);
}

/**
 * Builds a notice that shows `Dataview`'s name as code. Built by hand rather than with the library's
 * html-element helpers, because the copy `CodeScript Toolkit` serves to vault scripts does not export them.
 */
function createPluginNameFragment(prefix: string, suffix: string): DocumentFragment {
  return createFragment((fragment) => {
    fragment.appendText(prefix);
    fragment.createEl('code', { text: DATAVIEW_PLUGIN_NAME });
    fragment.appendText(suffix);
  });
}
