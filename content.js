console.log('[NotionExt] content.js loaded');
console.log('ChatGPT to Notion content script loaded');
console.log('Content script version: 1.0.1');
console.log('Document ready state:', document.readyState);

// Custom tooltip functions
function showCustomTooltip(element, text, pageData = null) {
  // Remove any existing tooltip
  hideCustomTooltip();
  
  const tooltip = document.createElement('div');
  tooltip.id = 'notion-custom-tooltip';
  
  // Create favicon HTML
  let faviconHtml = '';
  if (pageData) {
    if (pageData.favicon) {
      // Show the actual page icon (image or file)
      faviconHtml = `<img src="${pageData.favicon}" alt="" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display:none; width: 100%; height: 100%; font-size: 11px; color: #9CA3AF; display: flex; align-items: center; justify-content: center;" title="File">📄</div>`;
    } else if (pageData.iconType === 'emoji' && pageData.iconEmoji) {
      // Show the actual emoji that the user set
      faviconHtml = `<div style="width: 100%; height: 100%; font-size: 11px; display: flex; align-items: center; justify-content: center;" title="${pageData.iconEmoji}">${pageData.iconEmoji}</div>`;
    } else {
      // Show Material Icons file icon for pages with no custom icon
      faviconHtml = `<div style="width: 100%; height: 100%; font-size: 11px; color: #9CA3AF; display: flex; align-items: center; justify-content: center;" title="File">📄</div>`;
    }
  }
  
  tooltip.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 4px; line-height: 1;">
      <span>Save to</span>
      <div style="display: flex; align-items: center; justify-content: center; width: 11px; height: 11px;">
        ${faviconHtml}
      </div>
      <span>${pageData ? pageData.title : 'Notion'}</span>
    </div>
  `;
  tooltip.style.cssText = `
    position: fixed;
    background: #1f2937;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  `;
  
  document.body.appendChild(tooltip);
  
  // Position the tooltip
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - tooltipRect.height - 8;
  
  // Ensure tooltip stays within viewport
  if (left < 8) left = 8;
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  if (top < 8) {
    top = rect.bottom + 8;
  }
  
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  
  // Show tooltip instantly
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);
}

function hideCustomTooltip() {
  const tooltip = document.getElementById('notion-custom-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// Toast utility with Ant Design Alert styling
function showToast(message, isSuccess = true) {
  // Remove any existing toast
  const existing = document.getElementById('notion-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'notion-toast';
  
  // Create the toast content with Ant Design Alert styling
  const type = isSuccess ? 'success' : 'error';
  const icon = isSuccess ? '✓' : '✕';
  const colors = {
    success: {
      background: '#f6ffed',
      border: '#b7eb8f',
      text: '#52c41a',
      icon: '#52c41a'
    },
    error: {
      background: '#fff2f0',
      border: '#ffccc7',
      text: '#ff4d4f',
      icon: '#ff4d4f'
    }
  };

  toast.innerHTML = `
    <div style="
      display: flex;
      align-items: flex-start;
      padding: 8px 12px;
      background: ${colors[type].background};
      border: 1px solid ${colors[type].border};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5715;
      color: ${colors[type].text};
      max-width: 400px;
      word-wrap: break-word;
    ">
      <span style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        margin-top: 1px;
        font-size: 12px;
        font-weight: bold;
        color: ${colors[type].icon};
        flex-shrink: 0;
      ">${icon}</span>
      <span style="flex: 1;">${message}</span>
    </div>
  `;

  // Position the toast
  toast.style.position = 'fixed';
  toast.style.left = '50%';
  toast.style.bottom = '40px';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '9999';
  toast.style.opacity = '1';
  toast.style.transition = 'opacity 0.2s ease-in-out';
  
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getNotionConfig() {
  let token = localStorage.getItem('notion_token');
  let blockId = localStorage.getItem('notion_block_id');
  if (!token) {
    token = prompt('Enter your Notion integration token:');
    if (token) localStorage.setItem('notion_token', token);
  }
  if (!blockId) {
    blockId = prompt('Enter your Notion page (block) ID:');
    if (blockId) localStorage.setItem('notion_block_id', blockId);
  }
  return { token, blockId };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'pageSelected') {
    // Store the selected page info for use when saving
    localStorage.setItem('currentNotionPage', JSON.stringify(message.page));
    console.log('[NotionExt] Page selected:', message.page.title);
  }
});

// Replace the old sendToNotion function with the new one using chrome.storage.sync and toast
// Convert markdown text to Notion blocks
function markdownToNotionBlocks(text) {
  console.log('Processing markdown text:', text);
  
  const lines = text.split('\n');
  const blocks = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    console.log(`Line ${i}: "${line}" (trimmed: "${trimmedLine}")`);
    
    if (!trimmedLine) {
      // Empty line - create paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: []
        }
      });
      continue;
    }
    
    // Check for headers (more flexible matching)
    if (trimmedLine.match(/^#{1,6}\s/)) {
      const level = trimmedLine.match(/^(#{1,6})\s/)[1].length;
      const content = trimmedLine.replace(/^#{1,6}\s/, '');
      
      let blockType = 'heading_1';
      if (level === 2) blockType = 'heading_2';
      else if (level >= 3) blockType = 'heading_3';
      
      blocks.push({
        object: 'block',
        type: blockType,
        [blockType]: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      });
    } else if (trimmedLine.match(/^[-*]\s/)) {
      // Bullet list (more flexible)
      const content = trimmedLine.replace(/^[-*]\s/, '');
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      });
    } else if (trimmedLine.match(/^\d+\.\s/)) {
      // Numbered list
      const content = trimmedLine.replace(/^\d+\.\s/, '');
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      });
    } else if (trimmedLine.startsWith('```')) {
      // Code block
      let codeContent = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeContent += lines[j] + '\n';
        j++;
      }
      i = j; // Skip to end of code block
      
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeContent.trim() } }]
        }
      });
    } else if (trimmedLine.startsWith('> ')) {
      // Quote
      const content = trimmedLine.substring(2);
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      });
    } else {
      // Regular paragraph with inline formatting
      const richText = parseInlineMarkdown(trimmedLine);
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: richText
        }
      });
    }
  }
  
  console.log('Generated blocks count:', blocks.length);
  return blocks;
}

// Parse inline markdown formatting
function parseInlineMarkdown(text) {
  console.log('Parsing inline markdown:', text);
  
  const richText = [];
  let currentText = '';
  let i = 0;
  
  while (i < text.length) {
    // Check for bold (** or __)
    if (text.substring(i, i + 2) === '**' || text.substring(i, i + 2) === '__') {
      if (currentText) {
        richText.push({ type: 'text', text: { content: currentText } });
        currentText = '';
      }
      
      i += 2;
      let boldText = '';
      while (i < text.length && text.substring(i, i + 2) !== '**' && text.substring(i, i + 2) !== '__') {
        boldText += text[i];
        i++;
      }
      
      if (i < text.length) {
        richText.push({
          type: 'text',
          text: { content: boldText },
          annotations: { bold: true }
        });
        i += 2;
      } else {
        richText.push({ type: 'text', text: { content: '**' + boldText } });
      }
    } 
    // Check for italic (* or _)
    else if (text.substring(i, i + 1) === '*' || text.substring(i, i + 1) === '_') {
      if (currentText) {
        richText.push({ type: 'text', text: { content: currentText } });
        currentText = '';
      }
      
      i += 1;
      let italicText = '';
      while (i < text.length && text[i] !== '*' && text[i] !== '_') {
        italicText += text[i];
        i++;
      }
      
      if (i < text.length) {
        richText.push({
          type: 'text',
          text: { content: italicText },
          annotations: { italic: true }
        });
        i += 1;
      } else {
        richText.push({ type: 'text', text: { content: '*' + italicText } });
      }
    } 
    // Check for inline code (`)
    else if (text.substring(i, i + 1) === '`') {
      if (currentText) {
        richText.push({ type: 'text', text: { content: currentText } });
        currentText = '';
      }
      
      i += 1;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      
      if (i < text.length) {
        richText.push({
          type: 'text',
          text: { content: codeText },
          annotations: { code: true }
        });
        i += 1;
      } else {
        richText.push({ type: 'text', text: { content: '`' + codeText } });
      }
    } 
    // Regular character
    else {
      currentText += text[i];
      i++;
    }
  }
  
  if (currentText) {
    richText.push({ type: 'text', text: { content: currentText } });
  }
  
  console.log('Parsed rich text:', richText);
  return richText;
}

async function sendToNotion(selectedText) {
  console.log('Selected text:', selectedText);
  console.log('Text length:', selectedText.length);
  
  chrome.storage.sync.get('selectedNotionPage', (result) => {
    const pageData = result.selectedNotionPage;
    if (!pageData) {
      showToast('Please select a Notion page first (click extension icon)', false);
      return;
    }

    const { id: pageId, title: pageTitle } = pageData;
    const blocks = markdownToNotionBlocks(selectedText);
    
    console.log('Page ID being sent:', pageId);
    console.log('Page title:', pageTitle);
    console.log('Generated blocks:', JSON.stringify(blocks, null, 2));

    chrome.runtime.sendMessage(
      {
        type: 'notion-append-blocks',
        pageId,
        blocks
      },
      (response) => {
        if (response && response.success) {
          showToast(`Saved to Notion page: ${pageTitle}`, true);
        } else {
          showToast('Failed to save to Notion: ' + (response?.error || 'Unknown error'), false);
        }
      }
    );
  });
}

function ensureFlexRowWrapper(askBtn, notionBtn) {
  const parent = askBtn.parentNode;
  const style = window.getComputedStyle(parent);
  if (style.display === 'flex' && style.flexDirection === 'row') {
    askBtn.parentNode.insertBefore(notionBtn, askBtn.nextSibling);
  } else {
    const wrapper = document.createElement('div');
    wrapper.className = 'notion-flex-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.alignItems = 'center';
    parent.insertBefore(wrapper, askBtn);
    wrapper.appendChild(askBtn);
    wrapper.appendChild(notionBtn);
  }
}

function createNotionButton(selectedText, askBtn) {
  let btn = document.querySelector('.save-to-notion-btn-inline');
  if (!btn) {
    btn = document.createElement('button');
    // Copy class and style from Ask ChatGPT button
    btn.className = askBtn.className + ' save-to-notion-btn-inline';
    btn.style.cssText = askBtn.style.cssText;
    btn.textContent = 'Save to Notion';
    btn.style.marginLeft = '8px';
    btn.style.whiteSpace = 'nowrap';
    console.log('Created new button element');
  } else {
    console.log('Reusing existing button element');
  }
  
  // Update tooltip with selected page name
  chrome.storage.sync.get('selectedNotionPage', (result) => {
    const pageData = result.selectedNotionPage;
    let tooltipText = 'Save to Notion';
    if (pageData && pageData.title) {
      tooltipText = `Save to ${pageData.title}`;
    }
    
    // Create custom tooltip
    btn.addEventListener('mouseenter', () => {
      showCustomTooltip(btn, tooltipText, pageData);
    });
    
    btn.addEventListener('mouseleave', () => {
      hideCustomTooltip();
    });
  });
  
  // Remove any existing click handlers to avoid duplicates
  btn.onclick = null;
  
  btn.onclick = (e) => {
    console.log('Button clicked! Event:', e);
    e.stopPropagation();
    console.log('Button clicked! Text to send:', selectedText);
    console.log('Text length:', selectedText.length);
    sendToNotion(selectedText);
  };
  
  btn.style.display = 'inline-block';
  console.log('Button display set to inline-block');
  ensureFlexRowWrapper(askBtn, btn);
  console.log('Button positioned in DOM');
  
  // Test if button is visible
  setTimeout(() => {
    const visibleBtn = document.querySelector('.save-to-notion-btn-inline');
    if (visibleBtn) {
      console.log('Button is visible in DOM:', visibleBtn);
      console.log('Button text:', visibleBtn.textContent);
      console.log('Button style display:', visibleBtn.style.display);
      console.log('Button computed display:', window.getComputedStyle(visibleBtn).display);
    } else {
      console.log('Button not found in DOM after positioning');
    }
  }, 100);
}

function removeNotionButton() {
  const btn = document.querySelector('.save-to-notion-btn-inline');
  if (btn) btn.remove();
}

function getAskChatGPTButton() {
  // Multiple strategies to find the Ask ChatGPT button
  const allButtons = Array.from(document.querySelectorAll('button'));
  
  // Strategy 1: Look for button with "Ask ChatGPT" text
  let askBtn = allButtons.find(btn =>
    Array.from(btn.querySelectorAll('span')).some(
      span => span.textContent.trim() === 'Ask ChatGPT'
    )
  );
  
  // Strategy 2: Look for button with "Ask" text (in case it's just "Ask")
  if (!askBtn) {
    askBtn = allButtons.find(btn =>
      Array.from(btn.querySelectorAll('span')).some(
        span => span.textContent.trim().includes('Ask')
      )
    );
  }
  
  // Strategy 3: Look for any button that might be the main action button
  if (!askBtn) {
    askBtn = allButtons.find(btn => {
      const text = btn.textContent.trim().toLowerCase();
      return text.includes('ask') || text.includes('send') || text.includes('submit');
    });
  }
  
  // Strategy 4: Look for buttons with specific classes or attributes
  if (!askBtn) {
    askBtn = document.querySelector('button[data-testid="send-button"]') || 
             document.querySelector('button[aria-label*="Send"]') ||
             document.querySelector('button[aria-label*="Ask"]');
  }
  
  console.log('Found Ask ChatGPT button:', askBtn);
  return askBtn;
}

function showButtonIfSelection() {
  console.log('showButtonIfSelection called');
  const selection = window.getSelection();
  console.log('Selection:', selection);
  console.log('Selection collapsed:', selection?.isCollapsed);
  
  if (!selection || selection.isCollapsed) {
    console.log('No selection or collapsed selection, removing button');
    removeNotionButton();
    return;
  }
  
  const selectedText = selection.toString();
  console.log('Selected text length:', selectedText.length);
  console.log('Selected text preview:', selectedText.substring(0, 50) + '...');
  
  if (!selectedText.trim()) {
    console.log('No text selected, removing button');
    removeNotionButton();
    return;
  }
  
  const askBtn = getAskChatGPTButton();
  console.log('Ask button found:', askBtn);
  
  if (!askBtn) {
    console.log('No Ask ChatGPT button found, removing button');
    removeNotionButton();
    return;
  }
  
  console.log('Creating button for text:', selectedText.substring(0, 50) + '...');
  createNotionButton(selectedText, askBtn);
}

document.addEventListener('selectionchange', () => {
  console.log('Selection changed');
  setTimeout(showButtonIfSelection, 200);
});

document.addEventListener('click', () => {
  console.log('Click detected');
  setTimeout(showButtonIfSelection, 100);
}); 