export enum AutoRefreshMode {
  ActiveView = 'ActiveView',
  AllOpenViews = 'AllOpenViews',
  AllVisibleViews = 'AllVisibleViews',
  Off = 'Off'
}

export class PluginSettings {
  // eslint-disable-next-line no-magic-numbers
  public autoRefreshIntervalInSeconds = 5;
  public autoRefreshMode: AutoRefreshMode = AutoRefreshMode.Off;
  public excludeViewTypesForAutoRefresh: readonly string[] = [];
  public includeViewTypesForAutoRefresh: readonly string[] = [];
  public shouldAutoRefreshMarkdownViewInSourceMode = false;
  public shouldAutoRefreshOnFileChange = false;
  public shouldLoadDeferredViewsOnAutoRefresh = false;
  public shouldLoadDeferredViewsOnStart = false;
  public shouldUseQuickMarkdownViewRefresh = true;

  public isViewTypeIncluded(viewType: string): boolean {
    return (this.includeViewTypesForAutoRefresh.length === 0 || this.includeViewTypesForAutoRefresh.includes(viewType))
      && !this.excludeViewTypesForAutoRefresh.includes(viewType);
  }
}
