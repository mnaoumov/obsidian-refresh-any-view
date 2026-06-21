import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import type { GenericObject } from 'obsidian-dev-utils/type-guards';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';

interface OnLoadRecordTestable {
  onLoadRecord(record: GenericObject): Promise<void>;
}

function createComponent(): PluginSettingsComponent {
  return new PluginSettingsComponent({
    dataHandler: strictProxy<DataHandler>({}),
    pluginEventSource: strictProxy<PluginEventSource>({})
  });
}

describe('PluginSettingsComponent', () => {
  it('should create an instance', () => {
    expect(createComponent()).toBeInstanceOf(PluginSettingsComponent);
  });

  describe('onLoadRecord', () => {
    it('should migrate legacy autoRefreshOnFileChange to shouldAutoRefreshOnFileChange', async () => {
      const component = createComponent();
      const record: GenericObject = { autoRefreshOnFileChange: true };
      await castTo<OnLoadRecordTestable>(component).onLoadRecord(record);

      expect(record['shouldAutoRefreshOnFileChange']).toBe(true);
      expect(record['autoRefreshOnFileChange']).toBeUndefined();
    });

    it('should not modify record when legacy field is absent', async () => {
      const component = createComponent();
      const record: GenericObject = { shouldAutoRefreshOnFileChange: false };
      await castTo<OnLoadRecordTestable>(component).onLoadRecord(record);

      expect(record['shouldAutoRefreshOnFileChange']).toBe(false);
      expect(record['autoRefreshOnFileChange']).toBeUndefined();
    });
  });
});
