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

export class RefreshPreviewPlugin extends PluginBase<RefreshPreviewPluginSettings> {
  private autoRefreshIntervalId: null | number = null;

  public override async saveSettings(newSettings: RefreshPreviewPluginSettings): Promise<void> {
    await super.saveSettings(newSettings);
    this.registerAutoRefreshTimer();
  }

  protected override createPluginSettings(data: unknown): RefreshPreviewPluginSettings {
    return new RefreshPreviewPluginSettings(data);
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return new RefreshPreviewPluginSettingsTab(this);
  }

  protected override onLayoutReady(): void {
    this.addRefreshPreviewButton();
    this.registerAutoRefreshTimer();
  }

  protected override onloadComplete(): void {
    this.addCommand({
      checkCallback: this.refreshPreview.bind(this),
      id: 'refresh-preview',
      name: 'Refresh'
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

  private getActionsContainer(view: MarkdownView): Element | null {
    return view.containerEl.querySelector('.view-header .view-actions');
  }

  private getRefreshPreviewButton(actionsContainer: Element): HTMLButtonElement | null {
    return actionsContainer.querySelector<HTMLButtonElement>('.refresh-preview-button');
  }

  private handleModify(file: TAbstractFile): void {
    if (!this.settings.autoRefreshOnFileChange) {
      return;
    }

    if (!isFile(file)) {
      return;
    }

    if (!isMarkdownFile(this.app, file)) {
      return;
    }

    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) {
        this.refreshPreview(false, leaf.view);
      }
    }
  }

  private refreshPreview(checking?: boolean, view?: MarkdownView): boolean {
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

  private registerAutoRefreshTimer(): void {
    const MILLISECONDS_IN_SECOND = 1000;
    if (this.autoRefreshIntervalId) {
      clearInterval(this.autoRefreshIntervalId);
      this.autoRefreshIntervalId = null;
    }

    if (this.settings.autoRefreshIntervalInSeconds === 0) {
      return;
    }

    this.autoRefreshIntervalId = window.setInterval(() => {
      this.refreshPreview(false);
    }, this.settings.autoRefreshIntervalInSeconds * MILLISECONDS_IN_SECOND);

    this.registerInterval(this.autoRefreshIntervalId);
  }

  private async removeRefreshPreviewButton(): Promise<void> {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      await leaf.loadIfDeferred();
      this.removeRefreshPreviewButtonFromView(leaf.view as MarkdownView);
    }
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
}
