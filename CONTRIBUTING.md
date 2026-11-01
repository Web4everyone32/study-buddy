# Contributing to Study Buddy

Thanks for helping make learning easier. You don't need to write code to contribute: clear bug reports and feedback from learners are just as useful.

## Ways to help

- **Accessibility:** readability, keyboard navigation, screen reader support
- **Languages:** new translation pairs and subjects to test against
- **Quiz logic:** clearer questions and more believable wrong answers
- **UI:** clearer layouts, loading states and error messages
- **Setup and docs:** anything that confused you when you first installed it
- **Feedback:** tell us what you tried, what happened and what you expected

## Report a bug or suggest an idea

Search the [existing issues](https://github.com/Web4everyone32/study-buddy/issues) first, then [open a new one](https://github.com/Web4everyone32/study-buddy/issues/new).

For bugs, please include:

- Your Chrome version (from `chrome://version`)
- The model status shown in the extension
- The feature you used (Summarize, Quiz, Simplify, Translate, History or Compare)
- What you did, what you expected and what actually happened
- Any errors from the console, with a screenshot if it helps

Please don't paste private text, API keys or tokens into an issue.

## Set up the project

There's nothing to install or build. The extension runs directly from the source files.

1. Fork the repository, then clone your fork:

   ```bash
   git clone https://github.com/YOUR-USERNAME/study-buddy.git
   ```

2. Set up Chrome Beta and enable the required flags by following the **Installation** section of the [README](README.md).
3. Open `chrome://extensions/`, turn on **Developer mode**, click **Load unpacked** and select the project folder.
4. After changing code, click the reload icon on the extension's card, then reopen the popup or side panel.

## Project layout

| Path | What it does |
| --- | --- |
| `manifest.json` | Extension configuration and permissions (Manifest V3) |
| `src/background.js` | Service worker: right-click menu items and opening the side panel |
| `src/popup.html` | Popup interface |
| `src/sidepanel.html` | Side panel interface |
| `src/popup.js` | Main logic for the AI features, compare view, history and exports |
| `src/utils.js` | Shared helpers for reading the page selection and cleaning text |
| `src/styles.css` | Styles, including dyslexia-friendly mode |
| `assets/branding/` | Logo |

## Make a change

1. Create a branch from `main`:

   ```bash
   git checkout -b fix/short-description
   ```

2. Keep the change focused on one fix or feature, and match the style of the surrounding code.
3. Test it (see below).
4. Commit with a short message that says what changed, then push to your fork:

   ```bash
   git push origin fix/short-description
   ```

5. Open a pull request against `main`.

## Test your change

The project has no automated tests yet, so please test by hand in Chrome Beta:

- Run the matching test cases from the [Testing Guide](README.md#-testing-guide-for-judgesusers).
- Check the extension's popup, side panel and service worker consoles for errors.
- If you changed the interface, check it in light and dark mode and with Dyslexia mode on, and make sure it works using only the keyboard.

## Project principles

- **Keep it on-device.** Don't send user text to external servers. Selected text and study history should stay in the browser.
- **Keep it accessible.** Every control needs a visible focus state, a clear label and keyboard support.
- **Keep AI output honest.** Generated content should stay faithful to the selected text. Show a helpful message when a model isn't available.
- **Ask for as little as possible.** Explain any new permission in `manifest.json` in your pull request.
- **Never commit secrets.** That includes API keys, tokens and `.env` files.

## Pull request checklist

- [ ] The change does one thing, and the description explains what and why
- [ ] I tested it in Chrome Beta and listed the steps I ran
- [ ] I added before and after screenshots for visual changes
- [ ] I updated the README if behaviour or setup changed
- [ ] The pull request contains no secrets or private data

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
