# Interface typography

The approved Noto Sans SC preview replaces Windows system Chinese fonts with
self-hosted Noto Sans SC Variable. CSS and MUI share `--font-ui`; code and
identifiers use `--font-mono`, with Noto Sans SC as their Chinese fallback.
The pinned Fontsource variable package provides Unicode-range WOFF2 subsets
covering the font's full repertoire, not a subset of current UI translations.
Vite emits these assets into the committed application bundle. Browsers load
only required ranges; no Google Fonts service or external runtime request is
needed. Unsupported glyphs still fall back to the system.

Chinese typography uses 400 body text, 500 labels/controls and active navigation,
600 headings, zero tracking, 1.55 body line height and 1.6 paragraph line height.
The language selector sets the document language, so Latin-specific tracking
is restored in English. Both languages share the interface font family.

Following Apple's distinction between SF interface fonts, SF Mono for alignment,
and New York for reading/display, operational screens use sans-serif type.
Do not introduce serif headings into forms, tables or navigation, or use
monospace for decorative Chinese section labels. Apple font files are not
bundled. Standalone architecture SVGs and the publication-figure pipeline retain
their existing typography and are outside this interface change.

## Validation

Build and lint the frontend; inspect rendered platform fonts using Chrome CDP
`CSS.getPlatformFontsForNode` on Windows. Verify regular, medium and semibold
faces, Chinese in monospace regions, Chinese/English language switching,
responsive wrapping, and same-origin WOFF2 requests under the production CSP.
The variable font's internal family name may include `Thin`; the actual weight
is determined by its variable axis, not that family-name suffix.

Sources: https://developer.apple.com/fonts/ and
https://developer.apple.com/design/human-interface-guidelines/typography
Font distribution: https://fontsource.org/fonts/noto-sans-sc
