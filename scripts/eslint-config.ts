import type { Linter } from 'eslint';

import { defineConfig } from 'eslint/config';
import { defineEslintConfigs } from 'obsidian-dev-utils/script-utils/linters/eslint-config';

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
            // Identifiers (`markdown\ncanvas`, `file-explorer\nsearch`) — they must stay lowercase.
            ignoreRegex: [
              '^[a-z][a-z-]*(?:\\n[a-z][a-z-]*)+$'
            ]
          }
        ]
      }
    });
  }
});
