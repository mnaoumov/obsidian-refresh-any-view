import { OpenBugReportCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-bug-report-command-handler';
import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { PluginSettingsTabComponent } from '@mnaoumov/obsidian-lib/components/plugin-settings-tab-component';
import { PluginDataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';
import { PluginEventSourceImpl } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';

import { RefreshActiveViewCommandHandler } from './command-handlers/refresh-active-view-command-handler.ts';
import { RefreshAllOpenViewsCommandHandler } from './command-handlers/refresh-all-open-views-command-handler.ts';
import { RefreshAllVisibleViewsCommandHandler } from './command-handlers/refresh-all-visible-views-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { RefreshAnyViewComponent } from './refresh-any-view-component.ts';

export class Plugin extends PluginBase {
  protected override async onloadImpl(): Promise<void> {
    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );
    this.pluginSettingsComponent = pluginSettingsComponent;

    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent
        })
      })
    );

    const refreshAnyViewComponent = this.addChild(
      new RefreshAnyViewComponent({
        app: this.app,
        pluginSettingsComponent
      })
    );

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new RefreshActiveViewCommandHandler({
        refreshAnyViewComponent
      }),
      new RefreshAllVisibleViewsCommandHandler({
        refreshAnyViewComponent
      }),
      new RefreshAllOpenViewsCommandHandler({
        refreshAnyViewComponent
      }),
      new OpenBugReportCommandHandler({
        app: this.app,
        gitHubRepo: 'mnaoumov/obsidian-refresh-any-view',
        pluginId: this.manifest.id
      }),
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
