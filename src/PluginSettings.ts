export class PluginSettings {
  public autoRefreshIntervalInSeconds = 0;
  public excludeViewTypesForAutoRefresh: readonly string[] = [];
  public includeViewTypesForAutoRefresh: readonly string[] = [];
  public shouldAutoRefreshMarkdownViewInSourceMode = false;
  public shouldAutoRefreshOnFileChange = false;
  public shouldLoadDeferredViewsOnAutoRefresh = false;
  public shouldLoadDeferredViewsOnStart = false;

  public isViewTypeIncluded(viewType: string): boolean {
    return (this.includeViewTypesForAutoRefresh.length === 0 || this.includeViewTypesForAutoRefresh.includes(viewType))
      && !this.excludeViewTypesForAutoRefresh.includes(viewType);
  }
}
