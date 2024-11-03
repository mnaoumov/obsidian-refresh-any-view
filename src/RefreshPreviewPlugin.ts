import {
  MarkdownView,
  PluginSettingTab,
  setIcon,
  setTooltip,
  TAbstractFile
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import {
  isFile,
  isMarkdownFile
} from 'obsidian-dev-utils/obsidian/FileSystem';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import { RefreshPreviewPluginSettings } from './RefreshPreviewPluginSettings.ts';
import { RefreshPreviewPluginSettingsTab } from './RefreshPreviewPluginSettingsTab.ts';

export default class RefreshPreviewPlugin extends PluginBase<RefreshPreviewPluginSettings> {
  protected override createDefaultPluginSettings(): RefreshPreviewPluginSettings {
    return new RefreshPreviewPluginSettings();
  }

  protected override createPluginSettingsTab(): PluginSettingTab | null {
    return new RefreshPreviewPluginSettingsTab(this);
  }

  protected override onloadComplete(): void {
    this.addCommand({
      id: 'refresh-preview',
      name: 'Refresh',
      checkCallback: this.refreshPreview.bind(this)
    });

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.addRefreshPreviewButton();
      })
    );

    this.registerDomEvent(document, 'click', (event: MouseEvent): void => {
      if (event.target instanceof HTMLElement && event.target.matches('.refresh-preview-button')) {
        this.refreshPreview();
      }
    });
    this.register(() => {
      invokeAsyncSafely(() => this.removeRefreshPreviewButton());
    });
    this.registerEvent(this.app.vault.on('modify', this.handleModify.bind(this)));
  }

  protected override onLayoutReady(): void {
    this.addRefreshPreviewButton();
  }

  private refreshPreview(checking = false, view?: MarkdownView): boolean {
    if (!view) {
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView) {
        return false;
      }
      view = activeView;
    }

    if (view.getMode() !== 'preview') {
      return false;
    }

    if (!checking) {
      view.previewMode.rerender(true);
    }
    return true;
  }

  private addRefreshPreviewButton(): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }

    if (view.getMode() !== 'preview') {
      this.removeRefreshPreviewButtonFromView(view);
      return;
    }

    const actionsContainer = this.getActionsContainer(view);
    if (!actionsContainer) {
      return;
    }

    let refreshPreviewButton = this.getRefreshPreviewButton(actionsContainer);

    if (refreshPreviewButton) {
      return;
    }

    refreshPreviewButton = createEl('button', {
      cls: 'refresh-preview-button clickable-icon view-action'
    });
    setIcon(refreshPreviewButton, 'refresh-cw');
    setTooltip(refreshPreviewButton, 'Refresh preview');

    actionsContainer.prepend(refreshPreviewButton);
  }

  private getRefreshPreviewButton(actionsContainer: Element): HTMLButtonElement | null {
    return actionsContainer.querySelector<HTMLButtonElement>('.refresh-preview-button');
  }

  private async removeRefreshPreviewButton(): Promise<void> {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      await leaf.loadIfDeferred();
      this.removeRefreshPreviewButtonFromView(leaf.view as MarkdownView);
    }
  }

  private getActionsContainer(view: MarkdownView): Element | null {
    return view.containerEl.querySelector('.view-header .view-actions');
  }

  private removeRefreshPreviewButtonFromView(view: MarkdownView): void {
    const actionsContainer = this.getActionsContainer(view);

    if (!actionsContainer) {
      return;
    }

    const refreshPreviewButton = this.getRefreshPreviewButton(actionsContainer);

    if (refreshPreviewButton) {
      actionsContainer.removeChild(refreshPreviewButton);
    }
  }

  private handleModify(file: TAbstractFile): void {
    if (!this.settings.autoRefreshOnFileChange) {
      return;
    }

    if (!isFile(file)) {
      return;
    }

    if (!isMarkdownFile(file)) {
      return;
    }

    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) {
        this.refreshPreview(false, leaf.view);
      }
    }
  }
}
