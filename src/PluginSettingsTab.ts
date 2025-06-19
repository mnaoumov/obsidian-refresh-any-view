import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { PluginTypes } from './PluginTypes.ts';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginTypes> {
  public override display(): void {
    super.display();
    this.containerEl.empty();

    new SettingEx(this.containerEl)
      .setName('Should auto refresh on file change')
      .setDesc(createFragment((f) => {
        f.appendText('Whether to auto refresh the file view when the file is changed.');
        f.createEl('br');
        f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
      }))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldAutoRefreshOnFileChange');
      });

    new SettingEx(this.containerEl)
      .setName('Auto refresh interval (seconds)')
      .setDesc(createFragment((f) => {
        f.appendText('Set to 0 to disable auto refresh.');
        f.createEl('br');
        f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
      }))
      .addNumber((number) => {
        this.bind(number, 'autoRefreshIntervalInSeconds')
          .setMin(0);
      });

    new SettingEx(this.containerEl)
      .setName('Should auto refresh markdown view in Source / Live Preview mode')
      .setDesc(createFragment((f) => {
        f.appendText('Whether to refresh the markdown view in Source / Live Preview mode, if auto refresh is enabled.');
        f.createEl('br');
        f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
      }))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldAutoRefreshMarkdownViewInSourceMode');
      });

    new SettingEx(this.containerEl)
      .setName('Should load deferred views on auto refresh')
      .setDesc('Whether to load deferred views on auto refresh')
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldLoadDeferredViewsOnAutoRefresh');
      });

    new SettingEx(this.containerEl)
      .setName('Should load deferred views on start')
      .setDesc('Whether to load deferred views on start')
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldLoadDeferredViewsOnStart');
      });

    new SettingEx(this.containerEl)
      .setName('Include view types for auto refresh')
      .setDesc(createFragment((f) => {
        f.appendText('View types to include for auto refresh.');
        f.createEl('br');
        f.appendText('If empty, all view types will be included.');
      }))
      .addMultipleText((text) => {
        this.bind(text, 'includeViewTypesForAutoRefresh');
      });

    new SettingEx(this.containerEl)
      .setName('Exclude view types for auto refresh')
      .setDesc(createFragment((f) => {
        f.appendText('View types to exclude for auto refresh.');
        f.createEl('br');
        f.appendText('If empty, no view types will be excluded.');
      }))
      .addMultipleText((text) => {
        this.bind(text, 'excludeViewTypesForAutoRefresh');
      });
  }
}
