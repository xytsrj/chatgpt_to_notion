# ChatGPT to Notion Chrome Extension

A Chrome extension that allows you to save ChatGPT conversations directly to your Notion pages with a single click.

## Features

- 🔗 **Direct Integration**: Connect your Notion workspace with OAuth
- 📝 **Smart Text Selection**: Select any text in ChatGPT and save it to Notion
- 🎨 **Rich Formatting**: Converts markdown to Notion blocks with proper formatting
- 🚀 **One-Click Save**: Simple button appears next to "Ask ChatGPT" when text is selected
- 🔒 **Secure**: Uses OAuth for secure authentication with Notion

## Installation

### For Users

1. **Clone this repository**
   ```bash
   git clone https://github.com/yourusername/chatgpt-to-notion.git
   cd chatgpt-to-notion
   ```

2. **Set up your Notion Integration**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Give it a name (e.g., "ChatGPT to Notion")
   - Select your workspace
   - Copy the **Integration Token** and **Client ID**

3. **Configure the Extension**
   - Open `config.js` in a text editor
   - Replace the placeholder values with your actual Notion credentials:
   ```javascript
   export default {
     NOTION_CLIENT_ID: 'your-client-id-here',
     NOTION_CLIENT_SECRET: 'your-client-secret-here',
     NOTION_TOKEN_URL: 'https://api.notion.com/v1/oauth/token'
   };
   ```

4. **Load the Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chatgpt-to-notion` folder

5. **Connect to Notion**
   - Click the extension icon in your browser
   - Click "Connect to Notion"
   - Follow the OAuth flow to authorize the extension

## Usage

1. **Go to ChatGPT** (chat.openai.com)
2. **Select any text** in a conversation
3. **Click "Save to Notion"** button that appears next to "Ask ChatGPT"
4. **Choose your Notion page** from the dropdown
5. **Confirm** to save the content

## Features in Detail

### Text Selection
- The "Save to Notion" button automatically appears when you select text
- Works with any text selection in ChatGPT conversations
- Button is positioned next to the "Ask ChatGPT" button

### Notion Integration
- OAuth-based authentication for security
- Automatic page selection from your workspace
- Rich text formatting with markdown support
- Support for headings, lists, code blocks, and more

### Formatting Support
- **Headers**: `# H1`, `## H2`, `### H3`
- **Lists**: `- Bullet lists`, `1. Numbered lists`
- **Code**: `` `inline code` `` and ```code blocks```
- **Quotes**: `> Quote text`
- **Bold/Italic**: `**bold**`, `*italic*`

## Development

### Project Structure
```
chatgpt-to-notion/
├── background.js      # Background script (OAuth, API calls)
├── content.js         # Content script (button injection)
├── popup.js          # Popup interface logic
├── popup.html        # Popup interface
├── config.js         # Configuration (Notion credentials)
├── manifest.json     # Extension manifest
└── README.md         # This file
```

### Key Components

#### Background Script (`background.js`)
- Handles OAuth flow with Notion
- Manages API requests to Notion
- Processes page ID formatting
- Handles block appending

#### Content Script (`content.js`)
- Injects "Save to Notion" button
- Detects text selection
- Converts markdown to Notion blocks
- Manages button positioning

#### Popup Interface (`popup.js`, `popup.html`)
- OAuth connection interface
- Page selection dropdown
- User feedback and error handling

## API Endpoints Used

- **OAuth**: `https://api.notion.com/v1/oauth/authorize`
- **Token Exchange**: `https://api.notion.com/v1/oauth/token`
- **Page Verification**: `https://api.notion.com/v1/pages/{page_id}`
- **Block Append**: `https://api.notion.com/v1/blocks/{block_id}/children`
- **Search Pages**: `https://api.notion.com/v1/search`

## Troubleshooting

### Common Issues

1. **"Save to Notion" button doesn't appear**
   - Make sure you're on chat.openai.com
   - Select some text in a conversation
   - Check browser console for errors

2. **OAuth connection fails**
   - Verify your Notion integration credentials in `config.js`
   - Ensure the integration is properly set up in Notion
   - Check that the redirect URI is correct

3. **"Invalid URL" error**
   - The extension automatically formats page IDs
   - Ensure you're selecting a page, not a database
   - Check that the page is accessible to your integration

4. **Content not saving**
   - Verify the selected Notion page exists
   - Check that your integration has access to the page
   - Look for error messages in the browser console

### Debug Mode
- Open browser console (F12) to see detailed logs
- Check extension background page console for API errors
- Verify OAuth flow completion in extension popup

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Notion API](https://developers.notion.com/) for the excellent API
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/) for extension development
- The open-source community for inspiration and tools

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Look for similar issues in the GitHub Issues
3. Create a new issue with detailed information about your problem

---

**Note**: This extension requires a Notion integration token and proper OAuth setup. Make sure to keep your credentials secure and never commit them to version control. 