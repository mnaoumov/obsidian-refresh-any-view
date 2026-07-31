import type { SettingDefinitionItem } from 'obsidian';

import {
  getEnumKey,
  getEnumValue
} from 'obsidian-dev-utils/enum';
import { appendCodeBlock } from 'obsidian-dev-utils/obsidian/html-element';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import type { PluginSettings } from './plugin-settings.ts';

import { AutoRefreshMode } from './plugin-settings.ts';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    return [
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('Whether to auto refresh the file view when the file is changed.');
          f.createEl('br');
          f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
        }),
        name: 'Should auto refresh on file change',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldAutoRefreshOnFileChange', valueComponent: toggle });
          });
        }
      }),
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('How to auto refresh the view.');
          f.createEl('br');
          f.appendText('⚠️ This may cause flickering or losing some UI state such as the cursor position.');
        }),
        name: 'Auto refresh mode',
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            dropdown.addOptions({
              /* eslint-disable perfectionist/sort-objects -- Need to keep enum order. */
              [AutoRefreshMode.Off]: 'Off',
              [AutoRefreshMode.ActiveView]: 'Active view',
              [AutoRefreshMode.AllVisibleViews]: 'All visible views',
              [AutoRefreshMode.AllOpenViews]: 'All open views'
              /* eslint-enable perfectionist/sort-objects -- Need to keep enum order. */
            });
            this.bind({
              componentToPluginSettingsValueConverter: (value: string) => getEnumValue(AutoRefreshMode, value),
              onChanged: () => {
                // The interval row's `visible` predicate reads the mode, so Obsidian only has to
                // Re-evaluate the predicates in place — no re-render.
                this.refreshDomState();
              },
              pluginSettingsToComponentValueConverter: (value: AutoRefreshMode) => getEnumKey(AutoRefreshMode, value),
              propertyName: 'autoRefreshMode',
              valueComponent: dropdown
            });
          });
        }
      }),
      this.settingEx({
        desc: 'Interval in seconds to auto refresh the view(s).',
        name: 'Auto refresh interval (seconds)',
        render: (setting) => {
          setting.addNumber((number) => {
            this.bind({ propertyName: 'autoRefreshIntervalInSeconds', valueComponent: number })
              .setMin(1);
          });
        },
        visible: () => this.pluginSettingsComponent.settings.autoRefreshMode !== AutoRefreshMode.Off
      }),
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('Whether to refresh the markdown view in Source / Live Preview mode, if auto refresh is enabled.');
        }),
        name: 'Should auto refresh markdown view in Source / Live Preview mode',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldAutoRefreshMarkdownViewInSourceMode', valueComponent: toggle });
          });
        }
      }),
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('Whether to use quick refresh for markdown view in Source / Live Preview mode.');
          f.createEl('br');
          f.appendText('When enabled, custom panels in the markdown view might not be refreshed.');
          f.createEl('br');
          f.appendText(
            'When disabled, the full markdown view refreshing is performed, but it may cause flickering or losing some UI state such as the cursor position.'
          );
        }),
        name: 'Should use quick markdown view refresh',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldUseQuickMarkdownViewRefresh', valueComponent: toggle });
          });
        }
      }),
      this.settingEx({
        desc: 'Whether to load deferred views on auto refresh',
        name: 'Should load deferred views on auto refresh',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldLoadDeferredViewsOnAutoRefresh', valueComponent: toggle });
          });
        }
      }),
      this.settingEx({
        desc: 'Whether to load deferred views on start',
        name: 'Should load deferred views on start',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldLoadDeferredViewsOnStart', valueComponent: toggle });
          });
        }
      }),
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('View types to include for auto refresh.');
          f.createEl('br');
          f.appendText('Insert each view type on a new line');
          f.createEl('br');
          f.appendText('If empty, all view types will be included.');
          f.createEl('br');
          f.appendText('You can find the view type of a view via its context menu command ');
          appendCodeBlock(f, 'Copy view type \'...\' to clipboard');
          f.appendText('.');
        }),
        name: 'Include view types for auto refresh',
        render: (setting) => {
          setting.addMultipleText((text) => {
            this.bind({ propertyName: 'includeViewTypesForAutoRefresh', valueComponent: text });
            text.setPlaceholder('markdown\ncanvas');
          });
        }
      }),
      this.settingEx({
        desc: createFragment((f) => {
          f.appendText('View types to exclude for auto refresh.');
          f.createEl('br');
          f.appendText('Insert each view type on a new line');
          f.createEl('br');
          f.appendText('If empty, no view types will be excluded.');
          f.createEl('br');
          f.appendText('You can find the view type of a view via its context menu command ');
          appendCodeBlock(f, 'Copy view type \'...\' to clipboard');
          f.appendText('.');
        }),
        name: 'Exclude view types for auto refresh',
        render: (setting) => {
          setting.addMultipleText((text) => {
            this.bind({ propertyName: 'excludeViewTypesForAutoRefresh', valueComponent: text });
            text.setPlaceholder('file-explorer\nsearch');
          });
        }
      })
    ];
  }
}
