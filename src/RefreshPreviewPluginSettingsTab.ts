import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { RefreshPreviewPlugin } from './RefreshPreviewPlugin.ts';

export class RefreshPreviewPluginSettingsTab extends PluginSettingsTabBase<RefreshPreviewPlugin> {
  public override display(): void {
    this.containerEl.empty();

    new SettingEx(this.containerEl)
      .setName('Auto refresh on file change')
      .addToggle((toggle) => {
        this.bind(toggle, 'autoRefreshOnFileChange');
      });

    new SettingEx(this.containerEl)
      .setName('Auto refresh interval (seconds)')
      .setDesc('Set to 0 to disable auto refresh')
      .addNumber((number) => {
        this.bind(number, 'autoRefreshIntervalInSeconds')
          .setMin(0);
      });
  }
}
