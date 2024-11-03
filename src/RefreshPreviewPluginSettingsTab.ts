import { Setting } from 'obsidian';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { bindUiComponent } from 'obsidian-dev-utils/obsidian/Plugin/UIComponent';

import type RefreshPreviewPlugin from './RefreshPreviewPlugin.ts';

export class RefreshPreviewPluginSettingsTab extends PluginSettingsTabBase<RefreshPreviewPlugin, object> {
  public override display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName('Auto refresh on file change')
      .addToggle((toggle) => bindUiComponent(this.plugin, toggle, 'autoRefreshOnFileChange'));
  }
}
