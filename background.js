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

// 处理来自popup的消息（如果需要的话）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'openBookmarkManager':
      chrome.tabs.create({ url: 'chrome://bookmarks/' });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: '未知操作' });
  }
});