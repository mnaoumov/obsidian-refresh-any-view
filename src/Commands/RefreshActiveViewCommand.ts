import { View } from 'obsidian';
import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/Commands/CommandBase';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/Commands/NonEditorCommandBase';

import type { Plugin } from '../Plugin.ts';

class RefreshActiveViewCommandInvocation extends CommandInvocationBase<Plugin> {
  protected get activeView(): View {
    if (!this._activeView) {
      throw new Error('Active view not set');
    }
    return this._activeView;
  }

  private _activeView: null | View = null;

  public constructor(plugin: Plugin) {
    super(plugin);
  }

  protected override canExecute(): boolean {
    const activeView = this.app.workspace.getActiveViewOfType(View);
    this._activeView = activeView;
    return !!activeView;
  }

  protected override async execute(): Promise<void> {
    await this.plugin.refreshView(this.activeView);
  }
}

export class RefreshActiveViewCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-active-view',
      name: 'Refresh active view',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new RefreshActiveViewCommandInvocation(this.plugin);
  }
}
