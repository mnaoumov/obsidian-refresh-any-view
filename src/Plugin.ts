import type { TAbstractFile } from 'obsidian';
import type { PluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsWrapper';
import type { ReadonlyDeep } from 'type-fest';

import {
  FileView,
  ItemView,
  MarkdownView,
  Menu,
  TextFileView,
  View,
  WorkspaceLeaf
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { isFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { getCacheSafe } from 'obsidian-dev-utils/obsidian/MetadataCache';
import { registerPatch } from 'obsidian-dev-utils/obsidian/MonkeyAround';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { PluginSettings } from './PluginSettings.ts';
import type { PluginTypes } from './PluginTypes.ts';

import { AutoRefreshMode } from './PluginSettings.ts';
import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { PluginSettingsTab } from './PluginSettingsTab.ts';

type OnOpenTabHeaderMenuFn = WorkspaceLeaf['onOpenTabHeaderMenu'];

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
    this.registerEvent(this.app.vault.on('modify', this.handleModify.bind(this)));
    await this.loadDeferredViews();
    this.registerAutoRefreshTimer();

    const that = this;
    registerPatch(this, WorkspaceLeaf.prototype, {
      onOpenTabHeaderMenu: (next: OnOpenTabHeaderMenuFn): OnOpenTabHeaderMenuFn => {
        return function onOpenTabHeaderMenuPatched(this: WorkspaceLeaf, evt: MouseEvent, parentEl: HTMLElement): void {
          that.onOpenTabHeaderMenu(next, this, evt, parentEl);
        };
      }
    });
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
  }

  private canAutoRefreshView(view: View): boolean {
    if (!this.settings.isViewTypeIncluded(view.getViewType())) {
      return false;
    }

    if (view.leaf.isDeferred && !this.settings.shouldLoadDeferredViewsOnAutoRefresh) {
      return false;
    }

    if (view instanceof MarkdownView && view.getMode() === 'source' && !this.settings.shouldAutoRefreshMarkdownViewInSourceMode) {
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

  private async copyViewTypeToClipboard(viewType: string): Promise<void> {
    await window.navigator.clipboard.writeText(viewType);
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

  private getLeaves(condition: (leaf: WorkspaceLeaf) => boolean): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (condition(leaf)) {
        leaves.push(leaf);
      }
    });
    return leaves;
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

  private handleModify(file: TAbstractFile): void {
    if (!this.settings.shouldAutoRefreshOnFileChange) {
      return;
    }

    if (!isFile(file)) {
      return;
    }

    invokeAsyncSafely(() => this.refreshViews((view) => view instanceof FileView && view.file === file && this.canAutoRefreshView(view)));
  }

  private isMatchingAutoRefreshMode(view: View): boolean {
    switch (this.settings.autoRefreshMode) {
      case AutoRefreshMode.ActiveView:
        return view === this.app.workspace.getActiveViewOfType(View);
      case AutoRefreshMode.AllOpenViews:
        return true;
      case AutoRefreshMode.AllVisibleViews:
        return view.leaf.isVisible();
      case AutoRefreshMode.Off:
        return false;
      default:
        return false;
    }
  }

  private isVisibleView(view: View): boolean {
    return view.leaf.isVisible();
  }

  private async loadDeferredViews(): Promise<void> {
    if (!this.settings.shouldLoadDeferredViewsOnStart) {
      return;
    }

    const DELAY_IN_MILLISECONDS = 100;
    await sleep(DELAY_IN_MILLISECONDS);

    const leaves = this.getLeaves(() => true);
    const promises = leaves.map((leaf) => leaf.loadIfDeferred());
    await Promise.all(promises);
  }

  private onOpenTabHeaderMenu(next: OnOpenTabHeaderMenuFn, leaf: WorkspaceLeaf, evt: MouseEvent, parentEl: HTMLElement): void {
    next.call(leaf, evt, parentEl);
    const menu = Menu.forEvent(evt);
    menu.addItem((item) => {
      item.setTitle('Refresh view');
      item.setIcon('refresh-cw');
      item.setSection('pane');
      item.onClick(() => {
        invokeAsyncSafely(() => this.refreshView(leaf.view));
      });
    });

    menu.addItem((item) => {
      const viewType = leaf.view.getViewType();
      item.setTitle(`Copy view type '${viewType}' to clipboard`);
      item.setIcon('info');
      item.setSection('pane');
      item.onClick(() => {
        invokeAsyncSafely(() => this.copyViewTypeToClipboard(viewType));
      });
    });
  }

  private async refreshView(view: View): Promise<void> {
    const leaf = view.leaf;

    await leaf.loadIfDeferred();

    if (view instanceof TextFileView && view.dirty) {
      await view.save();
    }

    if (view instanceof MarkdownView) {
      if (view.file) {
        await getCacheSafe(this.app, view.file);
      }

      if (view.getMode() === 'preview') {
        view.previewMode.rerender(true);
        return;
      }

      const cm = view.editor.cm;
      const scrollTop = cm.scrollDOM.scrollTop;
      const text = cm.state.doc;
      const selection = cm.state.selection;
      cm.dispatch({
        changes: {
          from: 0,
          to: text.length
        }
      });
      cm.dispatch({
        changes: {
          from: 0,
          insert: text,
          to: 0
        },
        selection
      });
      requestAnimationFrame(() => {
        cm.scrollDOM.scrollTop = scrollTop;
      });
      return;
    }

    await leaf.rebuildView();
  }

  private async refreshViews(condition: (view: View) => boolean): Promise<void> {
    const leaves = this.getLeaves((leaf) => condition(leaf.view));

    await this.executeKeepingFocus(async () => {
      const promises = leaves.map((leaf) => this.refreshView(leaf.view));
      await Promise.all(promises);
    });
  }

  private registerAutoRefreshTimer(): void {
    const MILLISECONDS_IN_SECOND = 1000;
    if (this.autoRefreshIntervalId) {
      clearInterval(this.autoRefreshIntervalId);
      this.autoRefreshIntervalId = null;
    }

    if (this.settings.autoRefreshMode === AutoRefreshMode.Off) {
      return;
    }

    this.autoRefreshIntervalId = window.setInterval(
      () => {
        invokeAsyncSafely(() => this.refreshViews((view) => this.isMatchingAutoRefreshMode(view) && this.canAutoRefreshView(view)));
      },
      this.settings.autoRefreshIntervalInSeconds * MILLISECONDS_IN_SECOND
    );

    this.registerInterval(this.autoRefreshIntervalId);
  }
}
