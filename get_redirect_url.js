// This will log the redirect URL to use in your Notion integration settings
const redirectUrl = chrome.identity.getRedirectURL();
console.log('='.repeat(50));
console.log('NOTION REDIRECT URL:');
console.log(redirectUrl);
console.log('='.repeat(50));

// Also send it to the popup if it's open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get_redirect_url') {
    sendResponse({ url: redirectUrl });
  }
}); 