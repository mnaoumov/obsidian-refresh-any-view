import type { Linter } from 'eslint';

import { defineEslintConfigs } from '@mnaoumov/obsidian-dev-toolkit/linters/eslint-config';
import { defineConfig } from 'eslint/config';

export const configs: Linter.Config[] = defineEslintConfigs({
  customConfigs() {
    return defineConfig({
      rules: {
        'obsidianmd/ui/sentence-case': [
          'error',
          {
            brands: [
              'Source',
              'Live Preview'
            ],
            // Exempt placeholders that list newline-separated lowercase Obsidian view-type
            // identifiers (`markdown\ncanvas`, `file-explorer\nsearch`) — they must stay lowercase.
            ignoreRegex: [
              String.raw`^[a-z][a-z-]*(?:\n[a-z][a-z-]*)+$`
            ]
          }
        ]
      }
    });
  }
});
