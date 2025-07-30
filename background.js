import config from './config.js';

// Store state for verification
let pendingState = null;

// Helper function to show redirect URI during development
function logRedirectUri() {
  const redirectUri = chrome.identity.getRedirectURL();
  console.log('=== DEVELOPMENT HELPER ===');
  console.log('Current redirect URI:', redirectUri);
  console.log('Add this URI to your Notion integration settings for testing');
  console.log('Note: This URI will change during development. In production, your extension will have a permanent ID from the Chrome Web Store.');
  console.log('========================');
  return redirectUri;
}

// Handle OAuth flow
async function handleOAuth() {
  try {
    console.log('Starting OAuth flow...');
    
    // Generate state parameter for security
    pendingState = Math.random().toString(36).substring(2);
    console.log('Generated state:', pendingState);

    // Get and properly format the redirect URL
    const redirectUri = chrome.identity.getRedirectURL().replace(/\/*$/, '');
    console.log('Using redirect URI:', redirectUri);
    
    // Build OAuth URL using Notion's official endpoint and parameters
    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.append('client_id', config.NOTION_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', pendingState);

    const finalUrl = authUrl.toString();
    console.log('Opening authorization URL in new tab:', finalUrl);

    // Open in new tab instead of using launchWebAuthFlow
    chrome.tabs.create({ url: finalUrl });
    return { success: true, message: 'Authorization page opened in new tab' };
  } catch (error) {
    console.error('OAuth error:', error);
    return { success: false, error: error.message };
  }
}

// Handle Notion API requests
async function handleNotionRequest(endpoint, options = {}) {
  try {
    const { notionToken } = await chrome.storage.sync.get(['notionToken']);
    if (!notionToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        await chrome.storage.sync.remove(['notionToken']);
        throw new Error('Authentication expired');
      }
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Notion API error:', error);
    throw error;
  }
}

// Listen for navigation to our redirect URI
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    console.log('Navigation detected:', details.url);
    if (details.url.startsWith(chrome.identity.getRedirectURL())) {
      console.log('Redirect URI matched');
      
      const url = new URL(details.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      // Verify state parameter
      if (state !== pendingState) {
        throw new Error('OAuth state mismatch');
      }

      // Exchange code for token using HTTP Basic Auth
      console.log('Exchanging code for token...');
      const basicAuth = btoa(`${config.NOTION_CLIENT_ID}:${config.NOTION_CLIENT_SECRET}`);
      const tokenResponse = await fetch(config.NOTION_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: chrome.identity.getRedirectURL().replace(/\/*$/, ''),
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error('Token exchange error:', error);
        throw new Error(`Token exchange failed: ${error.message || tokenResponse.status}`);
      }

      const data = await tokenResponse.json();
      console.log('Token exchange successful');

      // Store the tokens
      await chrome.storage.sync.set({
        notionToken: data.access_token,
        workspaceId: data.workspace_id,
        workspaceName: data.workspace_name,
        workspaceIcon: data.workspace_icon,
        botId: data.bot_id
      });

      // Close the OAuth tab
      chrome.tabs.remove(details.tabId);

      // Notify the popup
      chrome.runtime.sendMessage({
        type: 'oauth_complete',
        success: true
      });
    }
  } catch (error) {
    console.error('Redirect handling error:', error);
    chrome.runtime.sendMessage({
      type: 'oauth_complete',
      success: false,
      error: error.message
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'notion-oauth') {
    handleOAuth().then(sendResponse);
    return true;
  }

  if (message.type === 'notion-request') {
    handleNotionRequest(message.endpoint, message.options)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'notion-append-blocks') {
    (async () => {
      try {
        console.log('=== NOTION APPEND BLOCKS START ===');
        console.log('Message received:', message);
        console.log('Page ID from message:', message.pageId);
        console.log('Blocks from message:', message.blocks);
        // Sanitize page ID
        const cleanPageId = (message.pageId || '').trim();
        console.log('Sanitized Page ID:', cleanPageId, 'Length:', cleanPageId.length, 'Char codes:', Array.from(cleanPageId).map(c => c.charCodeAt(0)));
        
        // Format page ID properly for Notion API
        // Remove any URL parts and extract just the ID
        let formattedPageId = cleanPageId;
        
        console.log('Initial formattedPageId:', formattedPageId);
        
        // If it's a full Notion URL, extract the page ID
        if (cleanPageId.includes('notion.so/')) {
          const urlParts = cleanPageId.split('/');
          formattedPageId = urlParts[urlParts.length - 1];
          // Remove any query parameters
          formattedPageId = formattedPageId.split('?')[0];
          console.log('Extracted from URL:', formattedPageId);
        }
        
        // Remove dashes and ensure it's a valid 32-character hex string
        formattedPageId = formattedPageId.replace(/-/g, '');
        console.log('After removing dashes:', formattedPageId);
        console.log('Length after removing dashes:', formattedPageId.length);
        
        // Validate that it's a valid hex string
        if (!/^[0-9a-fA-F]{32}$/.test(formattedPageId)) {
          console.error('Invalid page ID format - not a 32-character hex string');
          sendResponse({ success: false, error: 'Invalid page ID format. Please check your Notion page ID.' });
          return;
        }
        
        // Add dashes back in the correct format (8-4-4-4-12)
        formattedPageId = `${formattedPageId.slice(0, 8)}-${formattedPageId.slice(8, 12)}-${formattedPageId.slice(12, 16)}-${formattedPageId.slice(16, 20)}-${formattedPageId.slice(20, 32)}`;
        
        console.log('Final formatted Page ID:', formattedPageId);
        console.log('Original page ID:', cleanPageId);
        
        console.log('Blocks count:', message.blocks.length);
        console.log('Blocks preview:', JSON.stringify(message.blocks.slice(0, 2), null, 2));
        
        const { notionToken } = await chrome.storage.sync.get(['notionToken']);
        if (!notionToken) {
          console.log('No notion token found');
          sendResponse({ success: false, error: 'Not authenticated' });
          return;
        }
        
        console.log('Token found, making API request...');
        
        // First, verify the page exists and is accessible
        console.log('Verifying page exists...');
        const pageUrl = `https://api.notion.com/v1/pages/${formattedPageId}`;
        console.log('Page verification URL:', pageUrl);
        
        const pageResponse = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28'
          }
        });
        
        console.log('Page verification status:', pageResponse.status);
        if (!pageResponse.ok) {
          const pageError = await pageResponse.json();
          console.error('Page verification error:', pageError);
          sendResponse({ success: false, error: `Page not accessible: ${pageError.message || 'Unknown error'}` });
          return;
        }
        
        const pageData = await pageResponse.json();
        console.log('Page verification successful:', pageData.object, pageData.id);
        console.log('Page type:', pageData.object);
        console.log('Page properties:', Object.keys(pageData.properties || {}));
        console.log('Page block ID:', pageData.id);
        
        // Check if this is actually a database
        if (pageData.object === 'database') {
          console.log('This is a database, not a page. Cannot append blocks to databases.');
          sendResponse({ success: false, error: 'Cannot append content to databases. Please select a page instead.' });
          return;
        }
        
        const requestBody = { children: message.blocks };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        
        // Validate the request body structure
        if (!Array.isArray(message.blocks)) {
          console.error('Blocks is not an array:', message.blocks);
          sendResponse({ success: false, error: 'Invalid blocks format' });
          return;
        }
        
        // Use the page's block ID (which is the same as page ID but let's be explicit)
        const blockId = pageData.id;
        console.log('Using block ID for append:', blockId);
        
        // Try both formats for the block ID
        const formattedBlockId = blockId.replace(/-/g, '');
        console.log('Formatted block ID (no dashes):', formattedBlockId);
        console.log('Original block ID (with dashes):', blockId);
        console.log('Block ID length:', formattedBlockId.length);
        console.log('Block ID validation:', /^[0-9a-fA-F]{32}$/.test(formattedBlockId));
        
        // Use the blocks endpoint to append children
        const apiUrl = `https://api.notion.com/v1/blocks/${formattedBlockId}/children`;
        console.log('Full API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let error = {};
          try {
            error = await response.json();
            console.error('Notion API error response:', JSON.stringify(error, null, 2));
          } catch (e) {
            error = { message: 'Unknown error and could not parse error response.' };
            console.error('Could not parse error response:', e);
          }
          console.error('Notion API error:', JSON.stringify(error, null, 2));
          sendResponse({ success: false, error: error.message || JSON.stringify(error) });
          return;
        }

        const responseData = await response.json();
        console.log('Success response:', responseData);
        console.log('=== NOTION APPEND BLOCKS SUCCESS ===');
        sendResponse({ success: true });
      } catch (err) {
        console.error('=== NOTION APPEND BLOCKS ERROR ===');
        console.error('Notion append error:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'get-selected-page') {
    chrome.storage.sync.get('selectedNotionPage', (result) => {
      sendResponse(result);
    });
    return true;
  }
}); 