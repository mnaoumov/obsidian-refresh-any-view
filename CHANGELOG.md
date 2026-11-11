# CHANGELOG

## 3.7.1

This release has 1 fix and 3 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **deps:** override glob to 14 to clear GHSA-3g3m-2fjr-6pw4

### Documentation

- **changelog:** regroup the published release notes for readers
- make issue attachments optional and strongly encouraged
- link to the Obsidian resources page

## 3.7.0

This release has 1 new feature and 4 documentation changes. 7 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add a Report a bug command

### Documentation

- **readme:** point bug reports at the Report a bug command
- add issue-filing instructions for AI agents
- **readme:** combine related resources and plugin comparisons
- add a Similar plugins section to the README

## 3.6.9

This release has 1 fix and 6 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **demo-vault:** load the demo setup helpers from @mnaoumov/obsidian-lib

### Documentation

- name `obsidian-lib` in the plugin test comment
- name `obsidian-lib` where comments said dev-utils
- shorten the debugging section
- **changelog:** escape the issue-title tags so `markdownlint` and `cspell` pass
- **changelog:** name the issue each released entry resolved
- **readme:** lead the Debugging section with `Advanced Debug Mode`

## 3.6.8

This release has 1 fix and 2 documentation changes. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- stop a Live Preview refresh duplicating a note's properties when the note has no body (re #11 - \[BUG\] Refresh empty note with properties in live preview appends yaml frontmatter)

### Documentation

- mark plugin names as code
- **demo-vault:** make the Try it section of 01 Refresh a view runnable from buttons

## 3.6.7

This release has 1 documentation change. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Documentation

- mark plugin names as code

## 3.6.6

This release has 5 fixes and 5 documentation changes. 15 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **screenshots:** merge the reproducible mobile command-palette frame
- **test:** merge the headless demo-vault toolkit install
- **deps:** restore the lockfile's missing resolved and integrity fields
- **deps:** float devalue to 5.9.4, clearing GHSA-9rgm-9g3h-6x36
- **build:** wire build:compile to buildCompile and drop the duplicate leaf script

### Documentation

- replace the private rule-id citations with what they assert
- **changelog:** name `obsidian-dev-utils` by its package name
- replace the private tracker references with what they pointed at
- say where the debug command is run
- name the unversioned demo-vault asset and the folder it unzips into

## 3.6.5

This release has 2 fixes and 1 documentation change. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- **deps:** move to `obsidian-integration-testing` 11 and `obsidian-dev-utils` 96.5.2
- **deps:** drop the brace-expansion file: override that breaks a clean install

### Documentation

- point plugin-directory links at community.obsidian.md

## 3.6.4

This release has 1 fix and 5 documentation changes. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- override deepmerge-ts to clear GHSA-ggr8-5vv4-36mx

### Documentation

- **demo-vault:** unwrap the notes so Obsidian stops rendering a break per line
- **readme:** render the same in Obsidian's plugin page as on `GitHub`
- capture the mobile screenshot set for refresh-any-view
- **demo-vault:** give the demo vault its code buttons
- capture the community-store screenshot set

## 3.6.3

This release has 1 new feature and 1 documentation change.

### New

- **demo-vault:** migrate to `obsidian-dev-utils` 93.3.1 and adopt the authoring convention

### Documentation

- make the demo vault the documentation, in the standard layout

## 3.6.2

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 3.6.1

This release has maintenance changes only. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 3.6.0

This release has 1 documentation change. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Documentation

- fix the demo vault download instructions

## 3.5.28

This release has maintenance changes only. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 3.5.27

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.26

This release has 1 fix. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **demo-vault:** export invoke() from startup script; add Invocables folder

## 3.5.25

This release has 4 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Documentation

- standardize demo-vault README
- drop per-plugin demo-vault setup notes (bootstrap covered by the `obsidian-dev-utils` harness)
- **demo-vault:** create the `Refresh Any View` demo vault
- migrate to AGENTS.md

## 3.5.24

This release has maintenance changes only. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 3.5.23

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.22

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.21

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.20

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.19

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.18

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.17

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.16

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.15

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.14

This release has maintenance changes only. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

## 3.5.13

This release has 1 fix. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

### Fixed

- build

## 3.5.12

This release has maintenance changes only. 1 maintenance commit (tests, build, CI, refactoring, dependencies) is not listed.

## 3.5.11

- Minor changes

## 3.5.10

- Minor changes

## 3.5.9

- Minor changes

## 3.5.8

- Minor changes

## 3.5.7

- Minor changes

## 3.5.6

- Minor changes

## 3.5.5

- Minor changes

## 3.5.4

- Minor changes

## 3.5.3

- Minor changes

## 3.5.2

- Minor changes

## 3.5.1

- Minor changes

## 3.5.0

This release has 1 other change.

### Other changes

- restoreScrollPosition for all views

## 3.4.0

This release has 1 other change.

### Other changes

- shouldUseQuickMarkdownViewRefresh (#7)

## 3.3.1

This release has 1 other change.

### Other changes

- Fix manual refresh button (#7)

## 3.3.0

This release has 2 other changes.

### Other changes

- Update editor without flickering
- Update md file after its cache synced

## 3.2.1

This release has 1 other change.

### Other changes

- Add examples and docs

## 3.2.0

This release has 6 other changes.

### Other changes

- Add auto refresh mode
- Include/exclude view types
- Add menu items for invisible leaves
- copyViewTypeToClipboard
- Add warning
- Handle deferred views

## 3.1.0

This release has 4 other changes.

### Other changes

- Avoid flickering for markdown views in preview mode
- shouldAutoRefreshMarkdownViewInSourceMode
- Add refresh all views commands
- Handle modify only when fully loaded

## 3.0.0

This release has 3 other changes.

### Other changes

- Rebrand
- Refresh any view
- Update lib

## 2.0.19

- Minor changes

## 2.0.18

- Minor changes

## 2.0.17

- Minor changes

## 2.0.16

- Minor changes

## 2.0.15

- Minor changes

## 2.0.14

- Minor changes

## 2.0.13

This release has 1 other change.

### Other changes

- New template

## 2.0.12

- Minor changes

## 2.0.11

This release has 1 other change.

### Other changes

- Update template

## 2.0.10

This release has 2 other changes.

### Other changes

- Update BRAT links
- Switch to number component

## 2.0.9

This release has 1 other change.

### Other changes

- Fix validation

## 2.0.8

This release has 1 other change.

### Other changes

- Lint

## 2.0.7

This release has 1 other change.

### Other changes

- Format

## 2.0.6

- Minor changes

## 2.0.5

- Minor changes

## 2.0.4

- Minor changes

## 2.0.3

This release has 1 other change.

### Other changes

- Avoid default exports

## 2.0.2

- Minor changes

## 2.0.1

- Minor changes

## 2.0.0

This release has 2 other changes.

### Other changes

- Add auto refresh
- Ensure view is loaded

## 1.3.0

This release has 2 other changes.

### Other changes

- Use single button click handler
- Set tooltip

## 1.2.0

This release has 1 other change.

### Other changes

- Another memory leak fix

## 1.1.0

This release has 1 other change.

### Other changes

- Improve memory leak

## 1.0.2

This release has 1 other change.

### Other changes

- Fix plugin validation

## 1.0.1

This release has 1 other change.

### Other changes

- Update description

## 1.0.0

- Initial release
