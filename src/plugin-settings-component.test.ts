import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-component', () => ({
  PluginSettingsComponentBase: class {
    public async onLoadRecord(_record: object): Promise<void> {
      // Base no-op
    }
  }
}));

describe('PluginSettingsComponent', () => {
  it('should create an instance', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: strictProxy<PluginEventSource>({})
    });
    expect(component).toBeInstanceOf(PluginSettingsComponent);
  });

  describe('onLoadRecord', () => {
    it('should migrate legacy autoRefreshOnFileChange to shouldAutoRefreshOnFileChange', async () => {
      const component = new PluginSettingsComponent({
        dataHandler: strictProxy<DataHandler>({}),
        pluginEventSource: strictProxy<PluginEventSource>({})
      });

      const record: Record<string, unknown> = { autoRefreshOnFileChange: true };
      // eslint-disable-next-line no-restricted-syntax -- Accessing protected method for testing migration behavior.
      await (component as unknown as { onLoadRecord(r: object): Promise<void> }).onLoadRecord(record);

      expect(record['shouldAutoRefreshOnFileChange']).toBe(true);
      expect(record['autoRefreshOnFileChange']).toBeUndefined();
    });

    it('should not modify record when legacy field is absent', async () => {
      const component = new PluginSettingsComponent({
        dataHandler: strictProxy<DataHandler>({}),
        pluginEventSource: strictProxy<PluginEventSource>({})
      });

      const record: Record<string, unknown> = { shouldAutoRefreshOnFileChange: false };
      // eslint-disable-next-line no-restricted-syntax -- Accessing protected method for testing migration behavior.
      await (component as unknown as { onLoadRecord(r: object): Promise<void> }).onLoadRecord(record);

      expect(record['shouldAutoRefreshOnFileChange']).toBe(false);
      expect(record['autoRefreshOnFileChange']).toBeUndefined();
    });
  });
});
