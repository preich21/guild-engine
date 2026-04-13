<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Component library

This project uses shadcn/ui as a component library.
All UI components must be built using this library, and no custom CSS or HTML should be used for UI elements.
Use the shadcn MCP server to find the right components and their usage.

## i18n

This repository uses internationalization or i18n via Next.js.
No user-facing text must be added directly to *.tsx files, but instead added to src/i18n/dictionaries/de.ts and src/i18n/dictionaries/en.ts and then be referenced in the *.tsx files.

## Dark mode

This project supports both dark and light mode, via the NextThemesProvider.
All changes must make sure to not break either the light or dark modes.

## Responsive design

This project is meant to be used in web browsers on both PCs as well smartphones.
All changes to the UI must make sure to comply to both an upright smartphone layout as well as a widescreen PC layout. 
<!-- END:nextjs-agent-rules -->
