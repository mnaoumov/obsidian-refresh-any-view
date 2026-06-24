import type { TAbstractFile } from 'obsidian';

import {
  FileView,
  ItemView,
  MarkdownView,
  Menu,
  TextFileView,
  View,
  WorkspaceLeaf
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';
import { CallbackLayoutReadyComponent } from 'obsidian-dev-utils/obsidian/components/layout-ready-component';
import { MenuEventRegistrarComponent } from 'obsidian-dev-utils/obsidian/components/menu-event-registrar-component';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { isFile } from 'obsidian-dev-utils/obsidian/file-system';
import { getCacheSafe } from 'obsidian-dev-utils/obsidian/metadata-cache';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import { ValueWrapper } from 'obsidian-dev-utils/value-wrapper';

import { RefreshActiveViewCommandHandler } from './command-handlers/refresh-active-view-command-handler.ts';
import { RefreshAllOpenViewsCommandHandler } from './command-handlers/refresh-all-open-views-command-handler.ts';
import { RefreshAllVisibleViewsCommandHandler } from './command-handlers/refresh-all-visible-views-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { AutoRefreshMode } from './plugin-settings.ts';

type OnOpenTabHeaderMenuFn = WorkspaceLeaf['onOpenTabHeaderMenu'];

export class Plugin extends PluginBase {
  private autoRefreshIntervalId: null | number = null;
  private readonly itemViews = new WeakSet<ItemView>();
  private readonly monkeyAroundComponent = new MonkeyAroundComponent();
  private readonly pluginSettingsComponent = new PluginSettingsComponent({
    dataHandler: new PluginDataHandler(this),
    pluginEventSource: new PluginEventSourceImpl(this)
  });

  protected override onloadImpl(): void {
    this.addChild(this.pluginSettingsComponent);
    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent: this.pluginSettingsComponent
        })
      })
    );
    const menuEventRegistrarComponent = this.addChild(new MenuEventRegistrarComponent(this.app));
    this.addChild(
      new CommandHandlerComponent({
        activeFileProvider: new AppActiveFileProvider(this.app),
        commandHandlers: [
          new RefreshActiveViewCommandHandler({
            getActiveView: (): null | View => this.app.workspace.getActiveViewOfType(View),
            refreshView: this.refreshView.bind(this)
          }),
          new RefreshAllVisibleViewsCommandHandler({
            refreshAllVisibleViews: this.refreshAllVisibleViews.bind(this)
          }),
          new RefreshAllOpenViewsCommandHandler({
            refreshAllOpenViews: this.refreshAllOpenViews.bind(this)
          })
        ],
        commandRegistrar: new PluginCommandRegistrar(this),
        menuEventRegistrar: menuEventRegistrarComponent,
        pluginName: this.manifest.name
      })
    );
    this.addChild(this.monkeyAroundComponent);
    this.addChild(new CallbackLayoutReadyComponent(this.app, () => this.onLayoutReady()));

    this.registerEvent(this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this)));
  }

  private canAutoRefreshView(view: View): boolean {
    if (!this.pluginSettingsComponent.settings.isViewTypeIncluded(view.getViewType())) {
      return false;
    }

    if (view.leaf.isDeferred && !this.pluginSettingsComponent.settings.shouldLoadDeferredViewsOnAutoRefresh) {
      return false;
    }

    if (view instanceof MarkdownView && view.getMode() === 'source' && !this.pluginSettingsComponent.settings.shouldAutoRefreshMarkdownViewInSourceMode) {
      return false;
    }

    return true;
  }

  private async copyViewTypeToClipboard(viewType: string): Promise<void> {
    await activeWindow.navigator.clipboard.writeText(viewType);
  }

  private async executeKeepingFocus(callback: () => Promise<void>): Promise<void> {
    const activeElement = activeDocument.activeElement;
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
    if (!this.pluginSettingsComponent.settings.shouldAutoRefreshOnFileChange) {
      return;
    }

    if (!isFile(file)) {
      return;
    }

    invokeAsyncSafely(() => this.refreshViews((view) => view instanceof FileView && view.file === file && this.canAutoRefreshView(view)));
  }

  private isMatchingAutoRefreshMode(view: View): boolean {
    switch (this.pluginSettingsComponent.settings.autoRefreshMode) {
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
    if (!this.pluginSettingsComponent.settings.shouldLoadDeferredViewsOnStart) {
      return;
    }

    const DELAY_IN_MILLISECONDS = 100;
    await sleep(DELAY_IN_MILLISECONDS);

    const leaves = this.getLeaves(() => true);
    const promises = leaves.map((leaf) => leaf.loadIfDeferred());
    await Promise.all(promises);
  }

  private async onLayoutReady(): Promise<void> {
    this.handleLayoutChange();
    this.registerEvent(this.app.vault.on('modify', this.handleModify.bind(this)));
    await this.loadDeferredViews();
    this.registerAutoRefreshTimer();

    registerAsyncEvent(
      this,
      this.pluginSettingsComponent.on('saveSettings', () => {
        this.registerAutoRefreshTimer();
      })
    );

    const thisWrapper = ValueWrapper.of(this);
    this.monkeyAroundComponent.registerPatch(WorkspaceLeaf.prototype, {
      onOpenTabHeaderMenu: (next: OnOpenTabHeaderMenuFn): OnOpenTabHeaderMenuFn => {
        return function onOpenTabHeaderMenuPatched(this: WorkspaceLeaf, evt: MouseEvent, parentEl: HTMLElement): void {
          thisWrapper.value.onOpenTabHeaderMenu(next, this, evt, parentEl);
        };
      }
    });
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

  private async refreshAllOpenViews(): Promise<void> {
    await this.refreshViews(() => true);
  }

  private async refreshAllVisibleViews(): Promise<void> {
    await this.refreshViews(this.isVisibleView.bind(this));
  }

  private async refreshView(view: View): Promise<void> {
    const leaf = view.leaf;

    const viewScrollTop = view.containerEl.scrollTop;
    const viewScrollLeft = view.containerEl.scrollLeft;

    await leaf.loadIfDeferred();

    if (view instanceof TextFileView && view.dirty) {
      await view.save();
    }

    if (view instanceof MarkdownView) {
      if (view.file) {
        await getCacheSafe(this.app, view.file);
      }

      if (view.getMode() === 'preview') {
        if (this.pluginSettingsComponent.settings.shouldUseQuickMarkdownViewRefresh) {
          view.previewMode.rerender(true);
        } else {
          await leaf.rebuildView();
        }

        restoreScrollPosition();

        return;
      }

      let cm = view.editor.cm;
      const scrollTop = cm.scrollDOM.scrollTop;
      const text = cm.state.doc;
      const selection = cm.state.selection;
      if (this.pluginSettingsComponent.settings.shouldUseQuickMarkdownViewRefresh) {
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
      } else {
        await leaf.rebuildView();
        // eslint-disable-next-line require-atomic-updates -- Ignore possible race condition.
        cm = view.editor.cm;
      }
      window.requestAnimationFrame(() => {
        cm.scrollDOM.scrollTop = scrollTop;
      });
      return;
    }

    await leaf.rebuildView();
    restoreScrollPosition();

    function restoreScrollPosition(): void {
      window.requestAnimationFrame(() => {
        view.containerEl.scrollTop = viewScrollTop;
        view.containerEl.scrollLeft = viewScrollLeft;
      });
    }
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
      window.clearInterval(this.autoRefreshIntervalId);
      this.autoRefreshIntervalId = null;
    }

    if (this.pluginSettingsComponent.settings.autoRefreshMode === AutoRefreshMode.Off) {
      return;
    }

    this.autoRefreshIntervalId = window.setInterval(
      () => {
        invokeAsyncSafely(() => this.refreshViews((view) => this.isMatchingAutoRefreshMode(view) && this.canAutoRefreshView(view)));
      },
      this.pluginSettingsComponent.settings.autoRefreshIntervalInSeconds * MILLISECONDS_IN_SECOND
    );

    this.registerInterval(this.autoRefreshIntervalId);
  }
}
