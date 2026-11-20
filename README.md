# Royal Magical Library

A project for converting one format of yugioh card information to another.
Royal Magical Library provides its own internal format as a bridge between the other output options of each engine's script format, and konami registered text

## Getting started

## Usage

## Reading the output

### The labels of each part

## The output

`npm run release` packs the cards for the engines that read them (Sangan) into one zip, `release/rml-<commit>.zip`: `cards/<code>.json`, `cardSchema.ts` (their format) and `release.json` (the reader's commit and the card data commits). It refuses unless every card was built by one committed reader whose schema is still the current one, so the cards and their format always match. An engine pins a zip by its sha256; attach it to a GitHub release to give it a URL ([src/release.ts](src/release.ts)).

## Rulings

A card's text doesn't say everything the card does: the rules of the game decide the rest. Rulings live as JSON files under [rulings/](rulings/) (`general/`, `tcg/`, and `cards/`), backed by [rulings/rulings.schema.json](rulings/rulings.schema.json) for editor autocomplete and validation, in the format of [src/lib/rulingSchema.ts](src/lib/rulingSchema.ts). They are loaded and validated automatically on RML startup inside `openLibrary()` (selectable via `--region TCG|OCG` and `--rulings DIR` in the CLI), so editing or adding a ruling JSON takes effect immediately on the next run.

A ruling wins over a card's text, and the text over a script. The TCG plays by the OCG's rulings, except those a TCG ruling replaces. A reader follows the rulings that hold, and tags in each card what a ruling gave it (`ruled`), so the card's text can be written back without the rules, and a script that differs there differs from a named ruling. How the text reader does it, and how to add or update a ruling, is in [src/builders/EnglishReader/README.md](src/builders/EnglishReader/README.md#rulings).

## Project layout
