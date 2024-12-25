import { PluginSettingsBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsBase';

export class RefreshPreviewPluginSettings extends PluginSettingsBase {
  public autoRefreshIntervalInSeconds = 0;

  public autoRefreshOnFileChange = false;
  public constructor(data: unknown) {
    super();
    this.init(data);
  }
}
