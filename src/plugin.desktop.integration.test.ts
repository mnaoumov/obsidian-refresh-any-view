import type { MarkdownView } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Smoke test', () => {
  it('should load plugin on Desktop', () => {
    const vault = getTemporaryVault();
    expect(vault.path).toBeTruthy();
  });
});

describe('Refresh active view', () => {
  it('should keep a note holding only properties unchanged in Live Preview', async () => {
    const NOTE_PATH = 'Properties only.md';
    const NOTE_CONTENT = '---\nfoo: bar\n---\n';

    const vault = getTemporaryVault();
    vault.populate({ [NOTE_PATH]: NOTE_CONTENT });
    await vault.syncToDevice();

    const result = await evalInObsidian({
      async callback({ app, lib: { waitUntil }, notePath }) {
        const SETTLE_DELAY_IN_MILLISECONDS = 1000;

        await waitUntil({
          message: 'the staged note to appear in the vault',
          predicate: () => Boolean(app.vault.getFileByPath(notePath))
        });

        const file = app.vault.getFileByPath(notePath);
        if (!file) {
          throw new Error(`Note not found: ${notePath}`);
        }

        // Live Preview: source mode with the source toggle off. The bug does not show in Reading view or Source mode.
        const leaf = app.workspace.getLeaf(true);
        await leaf.openFile(file, { active: true, state: { mode: 'source', source: false } });
        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        const isExecuted = app.commands.executeCommandById('refresh-preview:refresh-active-view');
        await sleep(SETTLE_DELAY_IN_MILLISECONDS);

        const view = leaf.view as MarkdownView;
        await view.save();
        const fileContent = await app.vault.read(file);
        const editorContent = view.editor.getValue();
        leaf.detach();

        return {
          editorContent,
          fileContent,
          isExecuted
        };
      },
      input: { notePath: NOTE_PATH },
      vaultPath: vault.path
    });

    expect(result).toEqual({
      editorContent: NOTE_CONTENT,
      fileContent: NOTE_CONTENT,
      isExecuted: true
    });
  });
});
