# Refresh a view

Obsidian renders a view once, when it opens. If the view shows **dynamic content** - a Dataview query, an embedded note, a rendered timestamp, output from another plugin - that content is frozen at first render and only updates when you close and reopen the view. **Refresh Any View** re-renders the view **in place** instead, preserving your scroll position.

## Ways to refresh

The plugin gives you a toolbar button and three commands:

- **Refresh view** button
  - the circular-arrows icon the plugin adds to every view's toolbar (top-right of the tab). Refreshes just that view.
- **Refresh Any View: Refresh active view**
  - refreshes the currently focused view.
- **Refresh Any View: Refresh all visible views**
  - refreshes every view you can currently see (all panes on screen).
- **Refresh Any View: Refresh all open views**
  - refreshes every open view, including background tabs.

![The refresh button re-rendering a view in place](<./_assets/images/demo.gif>)

## Try it

1. Open this note (or any note) in **Reading** mode.
2. Click the **Refresh view** button in the top-right toolbar, or run **Refresh Any View: Refresh active view** from the Command Palette (`Ctrl`/`Cmd` + `P`).
3. The view re-renders in place - it does not close and reopen, and your scroll position is kept.

## Watch something actually go stale

The refresh commands work on any view, but to *see* what they fix you need content that renders once and then drifts. The classic case is a Dataview `dataviewjs` block printing the current time.

This vault cannot bundle Dataview - it is another author's plugin - so the button installs it from Obsidian's own Community plugins registry:

```code-button
---
caption: Install and enable Dataview
---
await require('/demoSetup.ts').installDataview(app);
```

Manual equivalent: **Settings -> Community plugins -> Browse**, search for `Dataview`, install and enable it.

With Dataview enabled, switch this note to **Reading** mode. The block below renders the moment you arrive and then never changes again - it is frozen at first render:

```dataviewjs
dv.span(new Date().toString());
```

Now refresh the view and watch the timestamp move:

```code-button
---
caption: Refresh active view
---
require('/demoSetup.ts').refreshActiveView(app);
```

Manual equivalent: click the circular-arrows button in this view's top-right toolbar, or run **Refresh Any View: Refresh active view** from the Command Palette.

## Make it happen on its own

Rather than clicking each time, let the plugin re-render on a timer:

```code-button
---
caption: Auto-refresh the active view every 2 seconds
---
await require('/demoSetup.ts').changeSettings(app, { autoRefreshIntervalInSeconds: 2, autoRefreshMode: 'ActiveView' });
```

Manual equivalent: set **Auto refresh mode** to `ActiveView` and **Auto refresh interval in seconds** to `2` in **Settings -> Community plugins -> Refresh Any View**.

Back in Reading mode, the timestamp now updates by itself. When you have seen enough, put it back:

```code-button
---
caption: Turn auto refresh off again
---
await require('/demoSetup.ts').changeSettings(app, { autoRefreshIntervalInSeconds: 5, autoRefreshMode: 'Off' });
```

Manual equivalent: set **Auto refresh mode** back to `Off` (and the interval back to its default of `5`).

See [02 Settings](<./02 Settings.md>) for the rest, including refreshing on file change.
