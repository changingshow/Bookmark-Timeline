// Chrome扩展后台脚本
// 使用Manifest V3的Service Worker

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
  console.log('时间轴书签已安装');
  
  // 设置默认配置
  chrome.storage.sync.set({
    theme: 'light',
    pageSize: 20,
    autoLoad: true
  });
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getBookmarks':
      handleGetBookmarks(request, sendResponse);
      return true; // 保持消息通道开放

    case 'openBookmarkManager':
      chrome.tabs.create({ url: 'chrome://bookmarks/' });
      sendResponse({ success: true });
      break;

    case 'updateTheme':
      chrome.storage.sync.set({ theme: request.theme });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: '未知操作' });
  }
});

// 获取书签数据的处理函数
async function handleGetBookmarks(request, sendResponse) {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    const bookmarks = extractBookmarksFromTree(bookmarkTree);

    // 按日期降序排序
    bookmarks.sort((a, b) => b.dateAdded - a.dateAdded);

    sendResponse({
      success: true,
      bookmarks: bookmarks,
      total: bookmarks.length
    });
  } catch (error) {
    console.error('获取书签失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 从书签树中提取所有书签
function extractBookmarksFromTree(nodes, bookmarks = []) {
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title || '未命名书签',
        url: node.url,
        dateAdded: node.dateAdded || Date.now(),
        parentId: node.parentId,
        index: node.index
      });
    }
    
    if (node.children) {
      extractBookmarksFromTree(node.children, bookmarks);
    }
  }
  
  return bookmarks;
}