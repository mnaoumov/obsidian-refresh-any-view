[Docs](https://github.com/mnaoumov/obsidian-refresh-any-view/)

# Settings

Open **Settings -> Community plugins -> Refresh Any View** to configure automatic refreshing. Each option below lists the setting key stored in the plugin's `data.json`.

## Refresh quality

- `shouldUseQuickMarkdownViewRefresh` - use a fast in-place re-render for Markdown views instead of fully rebuilding the view. Quicker, with less flicker; turn it off if a view does not refresh cleanly.

## Auto refresh

- `autoRefreshMode` - when to refresh automatically: `Off`, `ActiveView`, `AllVisibleViews`, or `AllOpenViews`.
- `autoRefreshIntervalInSeconds` - how often the timer fires while `autoRefreshMode` is not `Off` (a short interval may cause UI flickering).
- `shouldAutoRefreshOnFileChange` - also refresh a file's views whenever that file changes on disk.
- `shouldAutoRefreshMarkdownViewInSourceMode` - include Markdown views that are in source/editing mode in auto refresh (off by default so typing is not disturbed).

## Which views to auto refresh

- `includeViewTypesForAutoRefresh` - if non-empty, only these view types are auto-refreshed.
- `excludeViewTypesForAutoRefresh` - view types to never auto-refresh.

## Deferred views

- `shouldLoadDeferredViewsOnStart` - load views that Obsidian has deferred (not yet rendered) when the plugin starts.
- `shouldLoadDeferredViewsOnAutoRefresh` - also load deferred views as part of each auto refresh.
