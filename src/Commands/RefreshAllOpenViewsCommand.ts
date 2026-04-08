import { View } from 'obsidian';
import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/commands/command-base';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/commands/non-editor-command-base';

import type { Plugin } from '../Plugin.ts';

class RefreshAllOpenViewsCommandInvocation extends CommandInvocationBase<Plugin> {
  protected get activeView(): View {
    if (!this._activeView) {
      throw new Error('Active view not set');
    }
    return this._activeView;
  }

  private readonly _activeView: null | View = null;

  public constructor(plugin: Plugin) {
    super(plugin);
  }

  protected override async execute(): Promise<void> {
    await this.plugin.refreshAllOpenViews();
  }
}

export class RefreshAllOpenViewsCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-open-views',
      name: 'Refresh all open views',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new RefreshAllOpenViewsCommandInvocation(this.plugin);
  }
}
