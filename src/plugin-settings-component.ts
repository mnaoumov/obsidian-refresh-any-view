import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import type { GenericObject } from 'obsidian-dev-utils/type-guards';

import { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';

import { PluginSettings } from './plugin-settings.ts';

interface LegacySettings extends PluginSettings {
  autoRefreshOnFileChange: boolean;
}

interface PluginSettingsComponentConstructorParams {
  readonly dataHandler: DataHandler;
  readonly pluginEventSource: PluginEventSource;
}

export class PluginSettingsComponent extends PluginSettingsComponentBase<PluginSettings> {
  public constructor(params: PluginSettingsComponentConstructorParams) {
    super({
      ...params,
      pluginSettingsClass: PluginSettings
    });
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
