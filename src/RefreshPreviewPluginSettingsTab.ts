import { Setting } from 'obsidian';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';

import type { RefreshPreviewPlugin } from './RefreshPreviewPlugin.ts';

export class RefreshPreviewPluginSettingsTab extends PluginSettingsTabBase<RefreshPreviewPlugin> {
  public override display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName('Auto refresh on file change')
      .addToggle((toggle) => this.bind(toggle, 'autoRefreshOnFileChange'));

    new Setting(this.containerEl)
      .setName('Auto refresh interval (seconds)')
      .setDesc('Set to 0 to disable auto refresh')
      .addText((text) => {
        this.bind(text, 'autoRefreshIntervalInSeconds', {
          componentToPluginSettingsValueConverter: (uiValue: string) => parseInt(uiValue, 10),
          pluginSettingsToComponentValueConverter: (pluginSettingsValue: number) => pluginSettingsValue.toString(),
          // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
          valueValidator(uiValue: string): string | void {
            const num = parseInt(uiValue, 10);
            if (isNaN(num)) {
              return 'Please enter a numeric value';
            }
            if (num < 0) {
              return 'Value cannot be negative';
            }
          }
        });
        text.inputEl.type = 'number';
        text.inputEl.min = '0';
      });
  }
}
