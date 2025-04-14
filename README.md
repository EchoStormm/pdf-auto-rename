# PDF AutoRename

A Chrome extension that automatically renames PDF files using OpenAI's GPT-4 Vision API.

## Features

- Automatically intercepts PDF downloads
- Analyzes PDF content using OpenAI's GPT-4 Vision
- Suggests meaningful filenames based on PDF content
- Secure API key management
- Debug tools for API key validation

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` directory

## Usage

1. Click the extension icon to open the popup
2. Enter your OpenAI API key in the Settings tab
3. Test your API key using the Debug tab
4. Download any PDF file - the extension will automatically suggest a new filename based on its content

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm package` - Package the extension

## Requirements

- Chrome browser
- OpenAI API key with access to GPT-4 Vision

## Security

- API keys are stored securely using Chrome's storage API
- All API requests are made over HTTPS
- The extension only processes PDF files

## License

MIT
