import type { GenericObject } from 'obsidian-dev-utils/Object';

import { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';

import type { PluginTypes } from './PluginTypes.ts';

import { PluginSettings } from './PluginSettings.ts';

interface LegacySettings extends PluginSettings {
  autoRefreshOnFileChange: boolean;
}

export class PluginSettingsManager extends PluginSettingsManagerBase<PluginTypes> {
  protected override createDefaultSettings(): PluginSettings {
    return new PluginSettings();
  }

  protected override async onLoadRecord(record: GenericObject): Promise<void> {
    await super.onLoadRecord(record);
    const settings = record as Partial<LegacySettings>;
    if (settings.autoRefreshOnFileChange !== undefined) {
      settings.shouldAutoRefreshOnFileChange = settings.autoRefreshOnFileChange;
      delete settings.autoRefreshOnFileChange;
    }
  }
}
