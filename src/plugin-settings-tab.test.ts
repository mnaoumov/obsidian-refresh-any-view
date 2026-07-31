import type {
  App as AppOriginal,
  Plugin,
  SettingGroup
} from 'obsidian';
import type { GenericVoidFunction } from 'obsidian-dev-utils/function';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
import { SettingEx } from 'obsidian-dev-utils/obsidian/setting-ex';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsTab } from './plugin-settings-tab.ts';
import {
  AutoRefreshMode,
  PluginSettings
} from './plugin-settings.ts';

interface DropdownBindOptions {
  componentToPluginSettingsValueConverter(value: string): AutoRefreshMode;
  onChanged(newValue: AutoRefreshMode): void;
  pluginSettingsToComponentValueConverter(value: AutoRefreshMode): string;
}

interface VisibleRow {
  visible(): boolean;
}

let app: AppOriginal;
let settings: PluginSettings;

beforeEach(() => {
  vi.restoreAllMocks();
  app = App.createConfigured__().asOriginalType__();
  settings = new PluginSettings();
  // The real `bind` is exercised by `obsidian-dev-utils`'s own tests. Here we only need to observe
  // That the tab wires each component to the correct setting key, so we stub its return value
  // (an allowed test double): the real test-mocks components are strict proxies that throw on the
  // Duck-typing probes inside the real `bind`.
  vi.spyOn(PluginSettingsTabBase.prototype, 'bind').mockImplementation((params) => params.valueComponent);
});

describe('PluginSettingsTab', () => {
  it('should create an instance', () => {
    expect(createTab()).toBeInstanceOf(PluginSettingsTab);
  });

  it('should render settings into the container on display', () => {
    const tab = createTab();

    renderRows(tab);
    expect(tab.containerEl.children.length).toBeGreaterThan(0);
  });

  it('should hide the interval row while auto refresh is off and show it otherwise', () => {
    const tab = createTab();

    const intervalRow = tab.getSettingDefinitions()
      .find((definition) => 'name' in definition && definition.name === 'Auto refresh interval (seconds)');
    const isVisible = castTo<VisibleRow>(intervalRow).visible;

    expect(isVisible()).toBe(false);

    settings.autoRefreshMode = AutoRefreshMode.ActiveView;
    expect(isVisible()).toBe(true);
  });

  it('should bind each setting to the correct property name', () => {
    const tab = createTab();

    renderRows(tab);
    const boundKeys = vi.mocked(PluginSettingsTabBase.prototype.bind).mock.calls.map((call) => call[0].propertyName);
    expect(boundKeys).toContain('shouldAutoRefreshOnFileChange');
    expect(boundKeys).toContain('autoRefreshMode');
    expect(boundKeys).toContain('autoRefreshIntervalInSeconds');
    expect(boundKeys).toContain('includeViewTypesForAutoRefresh');
    expect(boundKeys).toContain('excludeViewTypesForAutoRefresh');
  });

  it('should drive the auto refresh mode dropdown converters and visibility toggling', () => {
    const tab = createTab();

    renderRows(tab);

    const optionsList = vi.mocked(PluginSettingsTabBase.prototype.bind).mock.calls
      .map((call) => castTo<Partial<DropdownBindOptions>>(call[0]))
      .filter((options): options is DropdownBindOptions => typeof options.componentToPluginSettingsValueConverter === 'function');

    expect(optionsList.length).toBeGreaterThan(0);

    for (const options of optionsList) {
      expect(options.componentToPluginSettingsValueConverter('Off')).toBe(AutoRefreshMode.Off);
      expect(options.pluginSettingsToComponentValueConverter(AutoRefreshMode.Off)).toBe('Off');
      options.onChanged(AutoRefreshMode.ActiveView);
      options.onChanged(AutoRefreshMode.Off);
    }
  });
});

function createTab(): PluginSettingsTab {
  const plugin = strictProxy<Plugin>({
    app,
    manifest: { id: 'refresh-preview' }
  });
  const pluginSettingsComponent = strictProxy<PluginSettingsComponentBase<PluginSettings>>({
    on: castTo<PluginSettingsComponentBase<PluginSettings>['on']>(vi.fn((_name: string, _callback: GenericVoidFunction) => ({
      asyncEventSource: {
        offref: vi.fn()
      }
    }))),
    settings
  });
  const tab = new PluginSettingsTab({ plugin, pluginSettingsComponent });
  // The dropdown's `onChanged` asks Obsidian to re-evaluate the `visible` predicates in place; there is no
  // Rendered tab in a unit test, so neutralize it.
  tab.refreshDomState = vi.fn();
  return tab;
}

/**
 * Invokes every declared row's `render` callback the way Obsidian does when the tab is opened, so the
 * bindings are still exercised now that the rows are declarative.
 *
 * @param tab - The settings tab.
 */
function renderRows(tab: PluginSettingsTab): void {
  for (const definition of tab.getSettingDefinitions()) {
    if ('render' in definition) {
      definition.render(new SettingEx(tab.containerEl), castTo<SettingGroup>(null));
    }
  }
}
