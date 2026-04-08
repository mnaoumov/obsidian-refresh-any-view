import { View } from 'obsidian';
import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/commands/command-base';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/commands/non-editor-command-base';

import type { Plugin } from '../Plugin.ts';

class RefreshAllVisibleViewsCommandInvocation extends CommandInvocationBase<Plugin> {
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
    await this.plugin.refreshAllVisibleViews();
  }
}

export class RefreshAllVisibleViewsCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'refresh-ccw',
      id: 'refresh-all-visible-views',
      name: 'Refresh all visible views',
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new RefreshAllVisibleViewsCommandInvocation(this.plugin);
  }
}
