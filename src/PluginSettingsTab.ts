import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { PluginTypes } from './PluginTypes.ts';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginTypes> {
  public override display(): void {
    super.display();
    this.containerEl.empty();

    new SettingEx(this.containerEl)
      .setName('Should auto refresh on file change')
      .setDesc('Whether to auto refresh the file view when the file is changed')
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldAutoRefreshOnFileChange');
      });

    new SettingEx(this.containerEl)
      .setName('Auto refresh interval (seconds)')
      .setDesc('Set to 0 to disable auto refresh')
      .addNumber((number) => {
        this.bind(number, 'autoRefreshIntervalInSeconds')
          .setMin(0);
      });

    new SettingEx(this.containerEl)
      .setName('Should auto refresh markdown view in Source / Live Preview mode')
      .setDesc('Whether to refresh the markdown view in Source / Live Preview mode, if auto refresh is enabled')
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldAutoRefreshMarkdownViewInSourceMode');
      });
  }
}
