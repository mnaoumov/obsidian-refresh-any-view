import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { PluginTypes } from './PluginTypes.ts';

import { AutoRefreshMode } from './PluginSettings.ts';

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
      .setName('Auto refresh mode')
      .setDesc(createFragment((f) => {
        f.appendText('How to auto refresh the view.');
        f.createEl('br');
        f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
      }))
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          /* eslint-disable perfectionist/sort-objects */
          [AutoRefreshMode.Off]: 'Off',
          [AutoRefreshMode.ActiveView]: 'Active view',
          [AutoRefreshMode.AllVisibleViews]: 'All visible views',
          [AutoRefreshMode.AllOpenViews]: 'All open views'
          /* eslint-enable perfectionist/sort-objects */
        });
        this.bind(dropdown, 'autoRefreshMode', {
          onChanged(newValue: AutoRefreshMode) {
            updateAutoRefreshIntervalSettingVisibility(newValue);
          }
        });
      });

    function updateAutoRefreshIntervalSettingVisibility(newValue: AutoRefreshMode): void {
      autoRefreshIntervalSetting.setVisibility(newValue !== AutoRefreshMode.Off);
    }

    const autoRefreshIntervalSetting = new SettingEx(this.containerEl)
      .setName('Auto refresh interval (seconds)')
      .setDesc('Interval in seconds to auto refresh the view(s).')
      .addNumber((number) => {
        this.bind(number, 'autoRefreshIntervalInSeconds')
          .setMin(1);
      });

    updateAutoRefreshIntervalSettingVisibility(this.plugin.settings.autoRefreshMode);

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
        f.appendText('Insert each view type on a new line');
        f.createEl('br');
        f.appendText('If empty, all view types will be included.');
        f.createEl('br');
        f.appendText('You can find the view type of a view via its context menu command ');
        appendCodeBlock(f, 'Copy view type \'...\' to clipboard');
        f.appendText('.');
      }))
      .addMultipleText((text) => {
        this.bind(text, 'includeViewTypesForAutoRefresh');
        text.setPlaceholder('markdown\ncanvas');
      });

    new SettingEx(this.containerEl)
      .setName('Exclude view types for auto refresh')
      .setDesc(createFragment((f) => {
        f.appendText('View types to exclude for auto refresh.');
        f.createEl('br');
        f.appendText('Insert each view type on a new line');
        f.createEl('br');
        f.appendText('If empty, no view types will be excluded.');
        f.createEl('br');
        f.appendText('You can find the view type of a view via its context menu command ');
        appendCodeBlock(f, 'Copy view type \'...\' to clipboard');
        f.appendText('.');
      }))
      .addMultipleText((text) => {
        this.bind(text, 'excludeViewTypesForAutoRefresh');
        text.setPlaceholder('file-explorer\nsearch');
      });
  }
}
