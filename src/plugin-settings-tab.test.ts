import type {
  App as AppOriginal,
  Plugin
} from 'obsidian';
import type { GenericVoidFunction } from 'obsidian-dev-utils/function';
import type { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
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

let app: AppOriginal;

beforeEach(() => {
  vi.restoreAllMocks();
  app = App.createConfigured__().asOriginalType__();
  // The real `bind` is exercised by `obsidian-dev-utils`'s own tests. Here we only need to observe
  // That the tab wires each component to the correct setting key, so we stub its return value
  // (an allowed test double): the real test-mocks components are strict proxies that throw on the
  // Duck-typing probes inside the real `bind`.
  vi.spyOn(PluginSettingsTabBase.prototype, 'bind').mockImplementation((valueComponent) => valueComponent);
});

describe('PluginSettingsTab', () => {
  it('should create an instance', () => {
    expect(createTab()).toBeInstanceOf(PluginSettingsTab);
  });

  it('should render settings into the container on display', () => {
    const tab = createTab();

    tab.displayLegacy();
    expect(tab.containerEl.children.length).toBeGreaterThan(0);
  });

  it('should bind each setting to the correct property name', () => {
    const tab = createTab();

    tab.displayLegacy();
    const boundKeys = vi.mocked(PluginSettingsTabBase.prototype.bind).mock.calls.map((call) => call[1]);
    expect(boundKeys).toContain('shouldAutoRefreshOnFileChange');
    expect(boundKeys).toContain('autoRefreshMode');
    expect(boundKeys).toContain('autoRefreshIntervalInSeconds');
    expect(boundKeys).toContain('includeViewTypesForAutoRefresh');
    expect(boundKeys).toContain('excludeViewTypesForAutoRefresh');
  });

  it('should drive the auto refresh mode dropdown converters and visibility toggling', () => {
    const tab = createTab();

    tab.displayLegacy();

    const optionsList = vi.mocked(PluginSettingsTabBase.prototype.bind).mock.calls
      .map((call) => castTo<DropdownBindOptions | undefined>(call[2]))
      .filter((options): options is DropdownBindOptions => options !== undefined);

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
    settings: new PluginSettings()
  });
  return new PluginSettingsTab({ plugin, pluginSettingsComponent });
}
