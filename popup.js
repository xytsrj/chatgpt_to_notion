document.addEventListener('DOMContentLoaded', async () => {
  const setupContainer = document.getElementById('setupContainer');
  const mainContainer = document.getElementById('mainContainer');
  const connectButton = document.getElementById('connectNotion');
        const dropdownTrigger = document.querySelector('.dropdown-trigger');
      const dropdownMenu = document.querySelector('.dropdown-menu');
      const searchInput = document.querySelector('.search-input-trigger');
      const triggerText = document.querySelector('.trigger-text');
      const triggerFavicon = document.querySelector('.trigger-favicon');
      const confirmBtn = document.querySelector('.btn-confirm');
      const cancelBtn = document.querySelector('.btn-cancel');

        let selectedPageId = null;
            let allPages = []; // Store all pages for filtering

      // Function to render pages in the dropdown
      function renderPages(pages) {
        if (pages.length === 0) {
          dropdownMenu.innerHTML = '<div class="dropdown-item error">No pages found</div>';
          return;
        }

        dropdownMenu.innerHTML = pages.map(page => {
          let faviconHtml;
          
          if (page.favicon) {
            // Show the actual page icon (image or file)
            faviconHtml = `<img src="${page.favicon}" alt="" class="page-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="page-favicon-file" style="display:none;" title="File"></div>`;
          } else if (page.iconType === 'emoji' && page.iconEmoji) {
            // Show the actual emoji that the user set
            const emoji = page.iconEmoji;
            faviconHtml = `<div class="page-favicon-emoji" title="${emoji}">${emoji}</div>`;
          } else {
            // Show Material Icons file icon for pages with no custom icon
            faviconHtml = `<div class="page-favicon-file" title="File"></div>`;
          }
          
          return `
            <div class="dropdown-item" data-id="${page.id}">
              ${faviconHtml}
              <span class="page-title">${page.title}</span>
            </div>
          `;
        }).join('');

        // Re-attach event listeners to new items
        dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            selectedPageId = item.dataset.id;
            const selectedPage = allPages.find(p => p.id === selectedPageId);
            
            // Show debug info for selected page
            console.log('Selected page debug:', selectedPage);
            
            updateSelectedState();
            chrome.storage.sync.set({ 
              selectedNotionPage: selectedPage
            });
            toggleDropdown(false);
          });
        });
      }

      // Check if user is authenticated
  async function checkAuth() {
    console.log('Checking authorization status...');
    const { notionToken, workspaceName } = await chrome.storage.sync.get(['notionToken', 'workspaceName']);
    console.log('Auth status:', {
      isAuthorized: !!notionToken,
      workspace: workspaceName || 'Not set'
    });
    
    if (notionToken) {
      setupContainer.style.display = 'none';
      mainContainer.style.display = 'block';
      loadPages();
    } else {
      setupContainer.style.display = 'block';
      mainContainer.style.display = 'none';
    }
  }

  // Load Notion pages
  async function loadPages() {
    try {
      dropdownMenu.innerHTML = '<div class="dropdown-item loading">Loading pages...</div>';
      
      const response = await chrome.runtime.sendMessage({
        type: 'notion-request',
        endpoint: 'search',
        options: {
          method: 'POST',
          body: JSON.stringify({
            filter: { property: 'object', value: 'page' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' }
          })
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      allPages = response.data.results
        .filter(page => !page.archived)
        .map(page => {
          // Debug: Log the icon data to see what we're getting
          console.log('Page icon data:', page.icon);
          
          let favicon = null;
          let iconType = 'default';
          let iconEmoji = null;
          
          if (page.icon) {
            if (page.icon.type === 'emoji') {
              favicon = null; // Emoji icons don't have URLs
              iconType = 'emoji';
              iconEmoji = page.icon.emoji;
            } else if (page.icon.type === 'external' && page.icon.external?.url) {
              favicon = page.icon.external.url;
              iconType = 'external';
            } else if (page.icon.type === 'file' && page.icon.file?.url) {
              favicon = page.icon.file.url;
              iconType = 'file';
            }
          }
          
          console.log(`Page "${page.properties?.title?.title?.[0]?.plain_text || 'Untitled'}": favicon = ${favicon}`);
          
          // Debug the page structure to see what we're getting
          console.log('Page structure:', page);
          console.log('Page properties:', page.properties);
          console.log('Title property:', page.properties?.title);
          
          // Try different ways to extract the title
          let title = 'Untitled';
          
          // Method 1: Standard title property
          if (page.properties?.title?.title?.[0]?.plain_text) {
            title = page.properties.title.title[0].plain_text;
          } else if (page.properties?.title?.rich_text?.[0]?.plain_text) {
            title = page.properties.title.rich_text[0].plain_text;
          }
          // Method 2: Name property (case variations)
          else if (page.properties?.Name?.title?.[0]?.plain_text) {
            title = page.properties.Name.title[0].plain_text;
          } else if (page.properties?.Name?.rich_text?.[0]?.plain_text) {
            title = page.properties.Name.rich_text[0].plain_text;
          } else if (page.properties?.name?.title?.[0]?.plain_text) {
            title = page.properties.name.title[0].plain_text;
          } else if (page.properties?.name?.rich_text?.[0]?.plain_text) {
            title = page.properties.name.rich_text[0].plain_text;
          }
          // Method 3: Look for any property that might contain the title
          else {
            // Search through all properties for potential title candidates
            for (const [key, value] of Object.entries(page.properties)) {
              if (value?.title?.[0]?.plain_text) {
                title = value.title[0].plain_text;
                console.log(`Found title in property "${key}": "${title}"`);
                break;
              } else if (value?.rich_text?.[0]?.plain_text) {
                title = value.rich_text[0].plain_text;
                console.log(`Found title in property "${key}": "${title}"`);
                break;
              }
            }
          }
          
          console.log(`Extracted title for page: "${title}"`);
          
          return {
            id: page.id,
            title: title,
            favicon: favicon,
            iconType: iconType,
            iconEmoji: iconEmoji
          };
        });

      if (allPages.length === 0) {
        dropdownMenu.innerHTML = '<div class="dropdown-item error">No pages found</div>';
        return;
      }



            // Render all pages initially
      renderPages(allPages);

      // Add search functionality
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredPages = allPages.filter(page => 
          page.title.toLowerCase().includes(searchTerm)
        );
        renderPages(filteredPages);
      });

      // Handle escape key to close dropdown
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          toggleDropdown(false);
        }
      });





      // Restore selected page
      chrome.storage.sync.get(['selectedNotionPage'], (result) => {
        if (result.selectedNotionPage) {
          // Verify the page is still accessible
          if (allPages.some(p => p.id === result.selectedNotionPage.id)) {
            selectedPageId = result.selectedNotionPage.id;
            updateSelectedState();
          } else {
            // Previously selected page is no longer accessible
            chrome.storage.sync.remove(['selectedNotionPage']);
          }
        }
      });
    } catch (error) {
      console.error('Error loading pages:', error);
      if (error.message === 'Authentication expired') {
        await chrome.storage.sync.remove(['notionToken']);
        checkAuth();
      } else {
        dropdownMenu.innerHTML = '<div class="dropdown-item error">Failed to load pages</div>';
      }
    }
  }

        function updateTriggerFavicon(page) {
        triggerFavicon.style.display = 'flex';
        
        if (page.favicon) {
          // Show the actual page icon (image or file)
          triggerFavicon.innerHTML = `<img src="${page.favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="page-favicon-file" style="display:none;" title="File"></div>`;
        } else if (page.iconType === 'emoji' && page.iconEmoji) {
          // Show the actual emoji that the user set
          const emoji = page.iconEmoji;
          triggerFavicon.innerHTML = `<div class="page-favicon-emoji" title="${emoji}">${emoji}</div>`;
        } else {
          // Show Material Icons file icon for pages with no custom icon
          triggerFavicon.innerHTML = `<div class="page-favicon-file" title="File"></div>`;
        }
      }

      function updateSelectedState() {
        const selectedItem = dropdownMenu.querySelector(`[data-id="${selectedPageId}"]`);
        if (selectedItem) {
          const pageTitle = selectedItem.querySelector('.page-title').textContent;
          triggerText.textContent = pageTitle;
          confirmBtn.disabled = false;

          // Update favicon
          const selectedPage = allPages.find(p => p.id === selectedPageId);
          if (selectedPage) {
            updateTriggerFavicon(selectedPage);
          }

          // Update selected state
          dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === selectedPageId);
          });
        } else {
          triggerText.textContent = 'Select the page';
          triggerFavicon.style.display = 'none';
          triggerFavicon.innerHTML = '';
          confirmBtn.disabled = true;
        }
      }

  function toggleDropdown(show) {
    if (show === undefined) {
      show = !dropdownMenu.classList.contains('show');
    }
    dropdownMenu.classList.toggle('show', show);
    dropdownTrigger.classList.toggle('active', show);
    
    if (show) {
      // Show search input and hide trigger content
      document.querySelector('.trigger-content').style.display = 'none';
      searchInput.style.display = 'block';
      searchInput.focus();
      searchInput.value = '';
      // Re-render all pages when opening
      if (allPages.length > 0) {
        renderPages(allPages);
      }
    } else {
      // Hide search input and show trigger content
      document.querySelector('.trigger-content').style.display = 'flex';
      searchInput.style.display = 'none';
      searchInput.value = '';
    }
  }

  // Handle connect button click
  connectButton.addEventListener('click', async () => {
    try {
      connectButton.disabled = true;
      connectButton.textContent = 'Connecting...';

      const response = await chrome.runtime.sendMessage({ type: 'notion-oauth' });

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect to Notion');
      }

      // Check auth status after successful connection
      await checkAuth();
    } catch (error) {
      console.error('Connection error:', error);
      connectButton.textContent = 'Connection failed - Try again';
    } finally {
      connectButton.disabled = false;
    }
  });

  // Event listeners
  dropdownTrigger.addEventListener('click', () => toggleDropdown());

  document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
      toggleDropdown(false);
    }
  });

  cancelBtn.addEventListener('click', () => window.close());

  confirmBtn.addEventListener('click', () => {
    if (selectedPageId) {
      window.close();
    }
  });

  // Check auth status on load
  await checkAuth();
}); 