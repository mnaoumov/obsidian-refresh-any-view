import type { DataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import type { PluginEventSource } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';
import type { GenericObject } from '@mnaoumov/typescript-lib/type-guards';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import {
  describe,
  expect,
  it
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';

interface OnLoadRecordTestable {
  onLoadRecord: (record: GenericObject) => Promise<void>;
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
