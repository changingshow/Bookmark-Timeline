class BookmarkManager {
  constructor() {
    this.bookmarks = [];
    this.filteredBookmarks = [];
    this.currentPage = 0;
    this.pageSize = 20;
    this.isLoading = false;
    this.hasMoreData = true;
    this.searchQuery = '';
    this.isSearchMode = false;
    
    this.initializeElements();
    this.bindEvents();
    this.initializeTheme();
    this.loadBookmarks();
  }

  initializeElements() {
    // 获取DOM元素
    this.elements = {
      container: document.querySelector('.container'),
      skeletonContainer: document.getElementById('skeletonContainer'),
      bookmarksContainer: document.getElementById('bookmarksContainer'),
      bookmarksList: document.getElementById('bookmarksList'),
      loadingIndicator: document.getElementById('loadingIndicator'),
      noMoreData: document.getElementById('noMoreData'),
      emptyState: document.getElementById('emptyState'),
      githubButton: document.getElementById('githubButton'),
      themeToggle: document.getElementById('themeToggle'),
      scrollbarSettings: document.getElementById('scrollbarSettings'),
      scrollbarPanel: document.getElementById('scrollbarPanel'),
      searchContainer: document.getElementById('searchContainer'),
      searchInput: document.getElementById('searchInput'),
      searchClear: document.getElementById('searchClear'),
      managerButton: document.getElementById('managerButton')
    };
  }

  bindEvents() {
    // GitHub按钮
    this.elements.githubButton.addEventListener('click', () => this.openGitHub());

    // 主题切换
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // 滚动条设置
    this.elements.scrollbarSettings.addEventListener('click', () => this.toggleScrollbarPanel());
    
    // 按钮颜色预设点击
    const buttonColorPresets = document.querySelectorAll('.button-color-preset');
    buttonColorPresets.forEach(preset => {
      preset.addEventListener('click', () => this.setButtonColor(preset.dataset.color));
    });
    
    // 滚动条颜色预设点击
    const scrollbarColorPresets = document.querySelectorAll('.scrollbar-color-preset');
    scrollbarColorPresets.forEach(preset => {
      preset.addEventListener('click', () => this.setScrollbarColor(preset.dataset.color));
    });
    
    // 搜索功能
    this.elements.searchClear.addEventListener('click', () => this.clearSearch());
    this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.elements.searchInput.blur();
      }
    });
    
    // 滚动加载
    this.elements.bookmarksContainer.addEventListener('scroll', () => this.handleScroll());
    
    // 打开书签管理器
    this.elements.managerButton.addEventListener('click', () => this.openBookmarkManager());

    // 键盘导航
    document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      if (!this.elements.scrollbarSettings.contains(e.target) && 
          !this.elements.scrollbarPanel.contains(e.target)) {
        this.elements.scrollbarPanel.classList.remove('active');
      }
    });
  }

  async initializeTheme() {
    try {
      const result = await chrome.storage.sync.get(['theme', 'buttonColor', 'scrollbarColor']);
      const theme = result.theme || 'light';
      const buttonColor = result.buttonColor || 'blue';
      const scrollbarColor = result.scrollbarColor || 'blue';
      
      document.documentElement.setAttribute('data-theme', theme);
      this.updateThemeIcon(theme);
      this.setButtonColor(buttonColor);
      this.updateButtonColorUI(buttonColor);
      this.setScrollbarColor(scrollbarColor);
      this.updateScrollbarColorUI(scrollbarColor);
    } catch (error) {
      console.error('初始化主题失败:', error);
    }
  }

  async toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    this.updateThemeIcon(newTheme);
    
    try {
      await chrome.storage.sync.set({ theme: newTheme });
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  }

  updateThemeIcon(theme) {
    const icon = this.elements.themeToggle.querySelector('.theme-icon');
    if (theme === 'dark') {
      icon.innerHTML = '<path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.52,9.22 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.22 6.91,16.84 7.51,17.35L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.22 18.05,8.5C17.63,7.78 17.09,7.15 16.49,6.65L20.65,7M20.64,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.48,14.78 18.75,14 18.89,13.23L20.64,17Z"/>';
    } else {
      icon.innerHTML = '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>';
    }
  }

  toggleScrollbarPanel() {
    this.elements.scrollbarPanel.classList.toggle('active');
  }

  async setButtonColor(colorName) {
    const colorMap = {
      red: '#ef4444',      // 赤
      orange: '#f97316',   // 橙
      yellow: '#eab308',   // 黄
      green: '#22c55e',    // 绿
      cyan: '#06b6d4',     // 青
      blue: '#3b82f6',     // 蓝
      purple: '#8b5cf6'    // 紫
    };

    const color = colorMap[colorName] || colorMap.blue;
    const root = document.documentElement;
    
    // 只设置按钮颜色CSS变量
    root.style.setProperty('--button-color', color);
    
    this.updateButtonColorUI(colorName);
    
    try {
      await chrome.storage.sync.set({ buttonColor: colorName });
    } catch (error) {
      console.error('保存按钮颜色设置失败:', error);
    }
  }

  updateButtonColorUI(colorName) {
    const presets = document.querySelectorAll('.button-color-preset');
    presets.forEach(preset => {
      if (preset.dataset.color === colorName) {
        preset.classList.add('active');
      } else {
        preset.classList.remove('active');
      }
    });
  }

  async setScrollbarColor(colorName) {
    const colorMap = {
      red: {        // 赤
        track: 'rgba(239, 68, 68, 0.1)',
        thumb: 'rgba(239, 68, 68, 0.6)',
        thumbHover: 'rgba(220, 38, 38, 0.8)'
      },
      orange: {     // 橙
        track: 'rgba(249, 115, 22, 0.1)',
        thumb: 'rgba(249, 115, 22, 0.6)',
        thumbHover: 'rgba(234, 88, 12, 0.8)'
      },
      yellow: {     // 黄
        track: 'rgba(234, 179, 8, 0.1)',
        thumb: 'rgba(234, 179, 8, 0.6)',
        thumbHover: 'rgba(202, 138, 4, 0.8)'
      },
      green: {      // 绿
        track: 'rgba(34, 197, 94, 0.1)',
        thumb: 'rgba(34, 197, 94, 0.6)',
        thumbHover: 'rgba(22, 163, 74, 0.8)'
      },
      cyan: {       // 青
        track: 'rgba(6, 182, 212, 0.1)',
        thumb: 'rgba(6, 182, 212, 0.6)',
        thumbHover: 'rgba(8, 145, 178, 0.8)'
      },
      blue: {       // 蓝
        track: 'rgba(59, 130, 246, 0.1)',
        thumb: 'rgba(59, 130, 246, 0.6)',
        thumbHover: 'rgba(37, 99, 235, 0.8)'
      },
      purple: {     // 紫
        track: 'rgba(139, 92, 246, 0.1)',
        thumb: 'rgba(139, 92, 246, 0.6)',
        thumbHover: 'rgba(124, 58, 237, 0.8)'
      }
    };

    const colors = colorMap[colorName] || colorMap.blue;
    const root = document.documentElement;
    
    // 深色主题需要调整颜色
    const currentTheme = root.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      colors.track = colors.track.replace('0.1', '0.15');
      colors.thumb = colors.thumb.replace('0.6', '0.4');
      colors.thumbHover = colors.thumbHover.replace('0.8', '0.6');
    }
    
    root.style.setProperty('--scrollbar-track', colors.track);
    root.style.setProperty('--scrollbar-thumb', colors.thumb);
    root.style.setProperty('--scrollbar-thumb-hover', colors.thumbHover);
    
    this.updateScrollbarColorUI(colorName);
    
    try {
      await chrome.storage.sync.set({ scrollbarColor: colorName });
    } catch (error) {
      console.error('保存滚动条颜色设置失败:', error);
    }
  }

  updateScrollbarColorUI(colorName) {
    const presets = document.querySelectorAll('.scrollbar-color-preset');
    presets.forEach(preset => {
      if (preset.dataset.color === colorName) {
        preset.classList.add('active');
      } else {
        preset.classList.remove('active');
      }
    });
  }


  clearSearch() {
    this.elements.searchInput.value = '';
    this.searchQuery = '';
    this.elements.searchClear.classList.remove('visible');
    this.filteredBookmarks = [...this.bookmarks];
    // 清空现有内容并重新渲染
    this.elements.bookmarksList.innerHTML = '';
    this.renderBookmarks(true);
  }

  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    
    // 控制清除按钮显示
    if (query.length > 0) {
      this.elements.searchClear.classList.add('visible');
    } else {
      this.elements.searchClear.classList.remove('visible');
    }
    
    if (this.searchQuery === '') {
      this.filteredBookmarks = [...this.bookmarks];
    } else {
      this.filteredBookmarks = this.bookmarks.filter(bookmark => 
        bookmark.title.toLowerCase().includes(this.searchQuery) ||
        bookmark.url.toLowerCase().includes(this.searchQuery)
      );
    }
    
    // 清空现有内容并重新渲染
    this.elements.bookmarksList.innerHTML = '';
    this.renderBookmarks(true);
  }

  async loadBookmarks() {
    try {
      this.showSkeleton();
      
      // 获取所有书签
      const bookmarkTree = await chrome.bookmarks.getTree();
      const allBookmarks = this.extractBookmarks(bookmarkTree);
      
      // 按日期降序排序
      this.bookmarks = allBookmarks.sort((a, b) => b.dateAdded - a.dateAdded);
      this.filteredBookmarks = [...this.bookmarks];
      
      this.hideSkeleton();
      this.renderBookmarks(true);
      
    } catch (error) {
      console.error('加载书签失败:', error);
      this.hideSkeleton();
      this.showEmptyState();
    }
  }

  extractBookmarks(nodes, bookmarks = []) {
    for (const node of nodes) {
      if (node.url) {
        bookmarks.push({
          id: node.id,
          title: node.title || '未命名书签',
          url: node.url,
          dateAdded: node.dateAdded || Date.now(),
          parentId: node.parentId
        });
      }
      
      if (node.children) {
        this.extractBookmarks(node.children, bookmarks);
      }
    }
    
    return bookmarks;
  }

  renderBookmarks(reset = false) {
    if (reset) {
      this.currentPage = 0;
      this.hasMoreData = true;
      this.elements.bookmarksList.innerHTML = '';
      this.elements.noMoreData.classList.add('hidden');
      this.elements.emptyState.classList.add('hidden');
    }

    if (this.filteredBookmarks.length === 0) {
      this.showEmptyState();
      return;
    }

    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageBookmarks = this.filteredBookmarks.slice(startIndex, endIndex);

    if (pageBookmarks.length === 0) {
      this.hasMoreData = false;
      this.elements.noMoreData.classList.remove('hidden');
      return;
    }

    // 如果是重置，按日期分组所有要显示的书签
    if (reset) {
      const groupedBookmarks = this.groupBookmarksByDate(pageBookmarks);
      
      // 按时间顺序排序分组键
      const sortedGroupKeys = this.sortGroupKeys(Object.keys(groupedBookmarks));
      
      // 渲染分组
      sortedGroupKeys.forEach(dateGroup => {
        const groupElement = this.createDateGroupElement(dateGroup);
        this.elements.bookmarksList.appendChild(groupElement);
        
        // 渲染该分组下的书签
        const groupContainer = groupElement.querySelector('.group-bookmarks');
        groupedBookmarks[dateGroup].forEach((bookmark, index) => {
          const bookmarkElement = this.createBookmarkElement(bookmark);
          bookmarkElement.style.animationDelay = `${(index % this.pageSize) * 0.1}s`;
          groupContainer.appendChild(bookmarkElement);
        });
      });
    } else {
      // 分页加载时，将新书签添加到对应分组
      const groupedBookmarks = this.groupBookmarksByDate(pageBookmarks);
      
      Object.keys(groupedBookmarks).forEach(dateGroup => {
        let groupContainer = this.elements.bookmarksList.querySelector(`[data-date-group="${dateGroup}"] .group-bookmarks`);
        
        // 如果分组不存在，创建新分组
        if (!groupContainer) {
          const groupElement = this.createDateGroupElement(dateGroup);
          // 找到合适的位置插入分组
          this.insertGroupInOrder(groupElement, dateGroup);
          groupContainer = groupElement.querySelector('.group-bookmarks');
        }
        
        // 渲染该分组下的书签
        groupedBookmarks[dateGroup].forEach((bookmark, index) => {
          const bookmarkElement = this.createBookmarkElement(bookmark);
          bookmarkElement.style.animationDelay = `${(index % this.pageSize) * 0.1}s`;
          groupContainer.appendChild(bookmarkElement);
        });
      });
    }

    this.currentPage++;
    
    if (endIndex >= this.filteredBookmarks.length) {
      this.hasMoreData = false;
      this.elements.noMoreData.classList.remove('hidden');
    }
  }

  groupBookmarksByDate(bookmarks) {
    const groups = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    bookmarks.forEach(bookmark => {
      const bookmarkDate = new Date(bookmark.dateAdded);
      const bookmarkDay = new Date(bookmarkDate.getFullYear(), bookmarkDate.getMonth(), bookmarkDate.getDate());
      
      let groupKey;
      if (bookmarkDay.getTime() === today.getTime()) {
        groupKey = 'today';
      } else if (bookmarkDay.getTime() === yesterday.getTime()) {
        groupKey = 'yesterday';
      } else {
        groupKey = this.formatDateGroup(bookmarkDate);
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(bookmark);
    });
    
    return groups;
  }

  formatDateGroup(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  createDateGroupElement(dateGroup) {
    const groupElement = document.createElement('div');
    groupElement.className = 'date-group';
    groupElement.setAttribute('data-date-group', dateGroup);
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'group-title';
    
    let displayTitle;
    if (dateGroup === 'today') {
      displayTitle = '今天';
    } else if (dateGroup === 'yesterday') {
      displayTitle = '昨天';
    } else {
      const date = new Date(dateGroup);
      displayTitle = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
    
    groupTitle.innerHTML = `
      <svg class="group-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
      </svg>
      <span>${displayTitle}</span>
    `;
    
    const groupBookmarks = document.createElement('div');
    groupBookmarks.className = 'group-bookmarks';
    
    groupElement.appendChild(groupTitle);
    groupElement.appendChild(groupBookmarks);
    
    return groupElement;
  }

  createBookmarkElement(bookmark) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.setAttribute('data-url', bookmark.url);
    
    const icon = this.createBookmarkIcon(bookmark.url);
    const content = this.createBookmarkContent(bookmark);
    
    item.appendChild(icon);
    item.appendChild(content);
    
    // 点击事件
    item.addEventListener('click', () => this.openBookmark(bookmark.url));
    
    // 右键菜单
    item.addEventListener('contextmenu', (e) => this.handleContextMenu(e, bookmark));
    
    return item;
  }

  createBookmarkIcon(url) {
    // 创建外层灰色圆角矩形容器
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'bookmark-icon-wrapper';

    // 创建内层图标容器
    const iconContainer = document.createElement('div');
    iconContainer.className = 'bookmark-icon loading';

    const img = document.createElement('img');
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;

    img.onload = () => {
      iconContainer.classList.remove('loading');
      iconContainer.classList.remove('error');
    };

    img.onerror = () => {
      iconContainer.classList.remove('loading');
      iconContainer.classList.add('error');
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>
        </svg>
      `;
    };

    img.src = faviconUrl;
    img.alt = '网站图标';
    iconContainer.appendChild(img);

    // 将图标容器放入包装器中
    iconWrapper.appendChild(iconContainer);

    return iconWrapper;
  }

  createBookmarkContent(bookmark) {
    const content = document.createElement('div');
    content.className = 'bookmark-content';

    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = bookmark.title;

    // 搜索高亮
    if (this.searchQuery) {
      title.innerHTML = this.highlightSearchTerm(bookmark.title, this.searchQuery);
    }

    // 添加URL显示
    const url = document.createElement('div');
    url.className = 'bookmark-url';
    try {
      const urlObj = new URL(bookmark.url);
      url.textContent = urlObj.hostname;
    } catch (e) {
      url.textContent = bookmark.url;
    }

    const date = document.createElement('div');
    date.className = 'bookmark-date';
    date.innerHTML = ` •
      ${this.formatDate(bookmark.dateAdded)}
    `;

    content.appendChild(title);
    content.appendChild(url);
    content.appendChild(date);

    return content;
  }


  highlightSearchTerm(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  formatDate(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;
    
    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < week) {
      return `${Math.floor(diff / day)}天前`;
    } else if (diff < month) {
      return `${Math.floor(diff / week)}周前`;
    } else if (diff < year) {
      return `${Math.floor(diff / month)}个月前`;
    } else {
      return `${Math.floor(diff / year)}年前`;
    }
  }

  handleScroll() {
    const container = this.elements.bookmarksContainer;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // 当滚动到底部附近时加载更多
    if (scrollTop + clientHeight >= scrollHeight - 100 && !this.isLoading && this.hasMoreData) {
      this.loadMoreBookmarks();
    }
  }


  async loadMoreBookmarks() {
    if (this.isLoading || !this.hasMoreData) return;
    
    this.isLoading = true;
    this.elements.loadingIndicator.classList.remove('hidden');
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.renderBookmarks();
    
    this.isLoading = false;
    this.elements.loadingIndicator.classList.add('hidden');
  }

  handleContextMenu(e, bookmark) {
    e.preventDefault();
    // 这里可以实现右键菜单功能
    console.log('右键菜单:', bookmark);
  }

  handleKeyNavigation(e) {
    // 实现键盘导航
    if (e.key === 'Escape') {
      this.elements.searchInput.blur();
    }
  }

  async openBookmark(url) {
    try {
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      console.error('打开书签失败:', error);
    }
  }

  async openBookmarkManager() {
    try {
      await chrome.tabs.create({ url: 'chrome://bookmarks/' });
      window.close();
    } catch (error) {
      console.error('打开书签管理器失败:', error);
    }
  }

  async openGitHub() {
    try {
      await chrome.tabs.create({ url: 'https://github.com/changingshow/Bookmark-Timeline' });
    } catch (error) {
      console.error('打开GitHub页面失败:', error);
    }
  }



  showSkeleton() {
    this.elements.skeletonContainer.classList.remove('hidden');
    this.elements.bookmarksContainer.classList.add('hidden');
  }

  hideSkeleton() {
    this.elements.skeletonContainer.classList.add('hidden');
    this.elements.bookmarksContainer.classList.remove('hidden');
  }

  showEmptyState() {
    this.elements.emptyState.classList.remove('hidden');
    this.elements.loadingIndicator.classList.add('hidden');
    this.elements.noMoreData.classList.add('hidden');
  }

  sortGroupKeys(groupKeys) {
    return groupKeys.sort((a, b) => {
      // 今天排在最前面
      if (a === 'today') return -1;
      if (b === 'today') return 1;
      
      // 昨天排在第二
      if (a === 'yesterday') return -1;
      if (b === 'yesterday') return 1;
      
      // 其他日期按时间降序排列
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }

  insertGroupInOrder(groupElement, dateGroup) {
    const existingGroups = this.elements.bookmarksList.querySelectorAll('.date-group');
    let insertPosition = null;
    
    for (let i = 0; i < existingGroups.length; i++) {
      const existingGroup = existingGroups[i];
      const existingDateGroup = existingGroup.getAttribute('data-date-group');
      
      if (this.shouldInsertBefore(dateGroup, existingDateGroup)) {
        insertPosition = existingGroup;
        break;
      }
    }
    
    if (insertPosition) {
      this.elements.bookmarksList.insertBefore(groupElement, insertPosition);
    } else {
      this.elements.bookmarksList.appendChild(groupElement);
    }
  }

  shouldInsertBefore(newGroup, existingGroup) {
    // 今天总是排在最前面
    if (newGroup === 'today') return true;
    if (existingGroup === 'today') return false;
    
    // 昨天排在今天之后，其他日期之前
    if (newGroup === 'yesterday') return existingGroup !== 'today';
    if (existingGroup === 'yesterday') return false;
    
    // 其他日期按时间降序排列
    const newDate = new Date(newGroup);
    const existingDate = new Date(existingGroup);
    return newDate.getTime() > existingDate.getTime();
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new BookmarkManager();
});

// 错误处理
window.addEventListener('error', (e) => {
  console.error('应用错误:', e.error);
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的Promise拒绝:', e.reason);
});