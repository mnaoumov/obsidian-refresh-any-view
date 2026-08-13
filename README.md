# Refresh Any View

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov)
[![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-refresh-any-view)](https://github.com/mnaoumov/obsidian-refresh-any-view/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-refresh-any-view/total)](https://github.com/mnaoumov/obsidian-refresh-any-view/releases)
[![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-refresh-any-view)

[Obsidian](https://obsidian.md/) renders a view once, when it opens. So a note showing a Dataview
query, an embedded note, output from another plugin, or simply the current time keeps showing its
*original* render — the content is stale and the only way to update it is to close the tab and open it
again, losing your place.

This plugin re-renders any view **in place**, keeping your scroll position: from a toolbar button, from
a command, or automatically on file change or on a timer.

## Demo vault

**The documentation is a demo vault.** Every feature has a note that explains what it does and why you
would want it, and walks you through it.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on GitHub with
nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **Refresh Any View: Open demo vault** command.
2. Downloading `refresh-preview-demo-vault-<version>.zip` (`<version>` is the release version) from the [Releases](https://github.com/mnaoumov/obsidian-refresh-any-view/releases).
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

## What it does

- **Refresh in place** — a toolbar button on every view, plus commands for the active view, every
  visible view, or every open view. Your scroll position survives.
  [01 Refresh a view](<./demo-vault/01 Refresh a view.md>)
- **Refresh automatically** — on file change, or on an interval, for content that should not wait for
  you to ask.
  [02 Settings](<./demo-vault/02 Settings.md>)

## Installation

The plugin is available in [the official Community Plugins repository](https://obsidian.md/plugins?id=refresh-preview).

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://obsidian.md/plugins) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-refresh-any-view).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command:

```js
window.DEBUG.enable('refresh-preview');
```

For more details, refer to the [documentation](https://mnaoumov.dev/obsidian-dev-utils/guides/debugging/).

## Rebranding

This plugin was formerly known as `Refresh Preview`.

The plugin was extended to refresh any view, not just the preview, so it got a new name.

However, for backward compatibility, the previous id `refresh-preview` is still used internally and you might find it

- in the plugin folder name;
- in the plugin URL;
- in the [Debugging](#debugging) section.

## Changelog

All notable changes to this project will be documented in the [CHANGELOG](./CHANGELOG.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)
