import type {
  Menu,
  TAbstractFile,
  WorkspaceLeaf
} from 'obsidian';
import type { PluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsWrapper';
import type { ReadonlyDeep } from 'type-fest';

import {
  FileView,
  ItemView,
  MarkdownView,
  TextFileView,
  View
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { isFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';
import { ViewType } from 'obsidian-typings/implementations';

import type { PluginSettings } from './PluginSettings.ts';
import type { PluginTypes } from './PluginTypes.ts';

import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { PluginSettingsTab } from './PluginSettingsTab.ts';

export class Plugin extends PluginBase<PluginTypes> {
  private autoRefreshIntervalId: null | number = null;
  private itemViews = new WeakSet<ItemView>();

  public override async onSaveSettings(
    newSettings: ReadonlyDeep<PluginSettingsWrapper<PluginSettings>>,
    oldSettings: ReadonlyDeep<PluginSettingsWrapper<PluginSettings>>,
    context?: unknown
  ): Promise<void> {
    await super.onSaveSettings(newSettings, oldSettings, context);
    this.registerAutoRefreshTimer();
  }

  protected override createSettingsManager(): PluginSettingsManager {
    return new PluginSettingsManager(this);
  }

  protected override createSettingsTab(): null | PluginSettingsTab {
    return new PluginSettingsTab(this);
  }

  protected override async onLayoutReady(): Promise<void> {
    await super.onLayoutReady();
    this.handleLayoutChange();
    this.registerAutoRefreshTimer();
    this.registerEvent(this.app.vault.on('modify', this.handleModify.bind(this)));
  }

  protected override async onloadImpl(): Promise<void> {
    await super.onloadImpl();
    this.addCommand({
      checkCallback: this.checkRefreshActiveView.bind(this),
      id: 'refresh-active-view',
      name: 'Refresh active view'
    });

    this.addCommand({
      callback: () => {
        invokeAsyncSafely(() => this.refreshViews(this.isVisibleView.bind(this)));
      },
      id: 'refresh-all-visible-views',
      name: 'Refresh all visible views'
    });

    this.addCommand({
      callback: () => {
        invokeAsyncSafely(() => this.refreshViews(() => true));
      },
      id: 'refresh-all-open-views',
      name: 'Refresh all open views'
    });

    this.registerEvent(this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this)));
    this.registerEvent(this.app.workspace.on('leaf-menu', this.handleLeafMenu.bind(this)));
  }

  private canAutoRefreshView(view: View): boolean {
    if (this.settings.shouldAutoRefreshMarkdownViewInSourceMode) {
      return true;
    }

    if (view instanceof MarkdownView && view.getMode() === 'source') {
      return false;
    }

    return true;
  }

  private checkRefreshActiveView(checking?: boolean): boolean {
    const activeView = this.app.workspace.getActiveViewOfType(View);
    if (!activeView) {
      return false;
    }

    if (!checking) {
      invokeAsyncSafely(() => this.refreshView(activeView));
    }
    return true;
  }

  private async executeKeepingFocus(callback: () => Promise<void>): Promise<void> {
    const activeElement = document.activeElement;
    try {
      await callback();
    } finally {
      if (activeElement instanceof HTMLElement) {
        activeElement.focus();
      }
    }
  }

  private handleLayoutChange(): void {
    const itemView = this.app.workspace.getActiveViewOfType(ItemView);
    if (!itemView) {
      return;
    }

    if (this.itemViews.has(itemView)) {
      return;
    }
    this.itemViews.add(itemView);

    const buttonEl = itemView.addAction('refresh-cw', 'Refresh view', () => {
      invokeAsyncSafely(() => this.refreshView(itemView));
    });

    this.register(() => {
      buttonEl.remove();
    });
  }

  private handleLeafMenu(menu: Menu, leaf: WorkspaceLeaf): void {
    menu.addItem((item) => {
      item.setTitle('Refresh view');
      item.setIcon('refresh-cw');
      item.setSection('pane');
      item.onClick(() => {
        invokeAsyncSafely(() => this.refreshView(leaf.view));
      });
    });
  }

  private handleModify(file: TAbstractFile): void {
    if (!this.settings.shouldAutoRefreshOnFileChange) {
      return;
    }

    if (!isFile(file)) {
      return;
    }

    invokeAsyncSafely(() => this.refreshViews((view) => view instanceof FileView && view.file === file && this.canAutoRefreshView(view)));
  }

  private isVisibleView(view: View): boolean {
    return view.containerEl.isShown();
  }

  private async refreshView(view: null | View): Promise<void> {
    if (!view) {
      return;
    }

    if (view instanceof TextFileView && view.dirty) {
      await view.save();
    }

    if (view instanceof MarkdownView && view.getMode() === 'preview') {
      view.previewMode.rerender(true);
      return;
    }

    const leaf = view.leaf;
    const viewState = leaf.getViewState();
    const ephemeralState = leaf.getEphemeralState() as unknown;
    await leaf.setViewState({ type: ViewType.Empty });
    await leaf.setViewState(viewState, ephemeralState);
  }

  private async refreshViews(filter: (view: View) => boolean): Promise<void> {
    const views: View[] = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (filter(leaf.view)) {
        views.push(leaf.view);
      }
    });

    await this.executeKeepingFocus(async () => {
      const promises = views.map((view) => this.refreshView(view));
      await Promise.all(promises);
    });
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

    this.autoRefreshIntervalId = window.setInterval(
      () => {
        invokeAsyncSafely(() => this.refreshViews((view) => view === this.app.workspace.getActiveViewOfType(View) && this.canAutoRefreshView(view)));
      },
      this.settings.autoRefreshIntervalInSeconds * MILLISECONDS_IN_SECOND
    );

    this.registerInterval(this.autoRefreshIntervalId);
  }
}
