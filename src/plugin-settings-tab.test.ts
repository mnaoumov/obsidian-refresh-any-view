/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-useless-constructor, no-restricted-syntax -- Test mocks require empty constructors and flexible patterns. */
import type { PluginSettingsTabBaseConstructorParams } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettings } from './plugin-settings.ts';

import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { AutoRefreshMode } from './plugin-settings.ts';

interface BindOptions {
  readonly componentToPluginSettingsValueConverter?: ((value: string) => unknown) | undefined;
  readonly onChanged?: ((newValue: unknown) => void) | undefined;
  readonly pluginSettingsToComponentValueConverter?: ((value: unknown) => string) | undefined;
}

const capturedBindOptions: BindOptions[] = [];

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-settings-tab', () => ({
  PluginSettingsTabBase: class {
    public containerEl = activeDocument.createElement('div');

    public pluginSettingsComponent = {
      settings: new (class {
        public autoRefreshIntervalInSeconds = 5;
        public autoRefreshMode: AutoRefreshMode = AutoRefreshMode.Off;
        public excludeViewTypesForAutoRefresh: readonly string[] = [];
        public includeViewTypesForAutoRefresh: readonly string[] = [];
        public shouldAutoRefreshMarkdownViewInSourceMode = false;
        public shouldAutoRefreshOnFileChange = false;
        public shouldLoadDeferredViewsOnAutoRefresh = false;
        public shouldLoadDeferredViewsOnStart = false;
        public shouldUseQuickMarkdownViewRefresh = true;
      })()
    };

    public constructor(_params: unknown) {}

    public bind(component: unknown, _property: string, options?: BindOptions): unknown {
      if (options) {
        capturedBindOptions.push(options);
      }

      return component;
    }

    public display(): void {}
  }
}));

vi.mock('obsidian-dev-utils/obsidian/setting-ex', () => ({
  SettingEx: class {
    public constructor(el: HTMLElement) {
      el.appendChild(activeDocument.createElement('div'));
    }

    public addDropdown(cb: (dropdown: { addOptions(opts: object): void }) => void): unknown {
      cb({
        addOptions: vi.fn()
      });
      return this;
    }

    public addMultipleText(cb: (text: { setPlaceholder(s: string): unknown }) => void): unknown {
      cb({ setPlaceholder: vi.fn() });
      return this;
    }

    public addNumber(cb: (component: { setMin(min: number): unknown }) => void): unknown {
      const component = { setMin: vi.fn(() => component) };
      cb(component);
      return this;
    }

    public addToggle(cb: (toggle: object) => void): unknown {
      cb({});
      return this;
    }

    public setDesc(_desc: unknown): unknown {
      return this;
    }

    public setName(_name: string): unknown {
      return this;
    }

    public setVisibility(_visible: boolean): unknown {
      return this;
    }
  }
}));

vi.mock('obsidian-dev-utils/enum', () => ({
  getEnumKey: vi.fn((_e: unknown, value: unknown) => String(value)),
  getEnumValue: vi.fn((_e: unknown, key: unknown) => String(key))
}));

vi.mock('obsidian-dev-utils/html-element', () => ({
  appendCodeBlock: vi.fn()
}));

describe('PluginSettingsTab', () => {
  function createSettingsTab(): PluginSettingsTab {
    return new PluginSettingsTab(castTo<PluginSettingsTabBaseConstructorParams<PluginSettings>>({}));
  }

  it('should create an instance', () => {
    const tab = createSettingsTab();
    expect(tab).toBeInstanceOf(PluginSettingsTab);
  });

  it('should render settings in display()', () => {
    capturedBindOptions.length = 0;
    const tab = createSettingsTab();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Testing display() which is deprecated but still the mechanism used by PluginSettingsTabBase.
    tab.display();
    expect(tab.containerEl.children.length).toBeGreaterThan(0);
    // Invoke the dropdown converters after display() so autoRefreshIntervalSetting is initialized
    for (const opts of capturedBindOptions) {
      opts.componentToPluginSettingsValueConverter?.('Off');
      opts.onChanged?.(AutoRefreshMode.ActiveView);
      opts.onChanged?.(AutoRefreshMode.Off);
      opts.pluginSettingsToComponentValueConverter?.(AutoRefreshMode.Off);
    }
  });

  it('should call updateAutoRefreshIntervalSettingVisibility with Off mode', () => {
    capturedBindOptions.length = 0;
    const tab = createSettingsTab();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Testing display() behavior with different setting values.
    tab.display();
    expect(tab.containerEl.children.length).toBeGreaterThan(0);
    for (const opts of capturedBindOptions) {
      opts.onChanged?.(AutoRefreshMode.Off);
    }
  });
});
/* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/no-useless-constructor, no-restricted-syntax -- End of test file. */
