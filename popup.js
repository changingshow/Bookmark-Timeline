class BookmarkManager {
  constructor() {
    this.bookmarks = [];
    this.filteredBookmarks = [];
    this.currentPage = 0;
    this.pageSize = 20;
    this.isLoading = false;
    this.hasMoreData = true;
    this.searchQuery = '';

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
      themeSettings: document.getElementById('themeSettings'),
      themePanel: document.getElementById('themePanel'),
      searchContainer: document.getElementById('searchContainer'),
      searchInput: document.getElementById('searchInput'),
      searchClear: document.getElementById('searchClear'),
      managerButton: document.getElementById('managerButton'),
      backToTop: document.getElementById('backToTop'),
      contextMenu: document.getElementById('contextMenu'),
      showFolderItem: document.getElementById('showFolderItem'),
      deleteBookmarkItem: document.getElementById('deleteBookmarkItem'),
      folderPath: document.getElementById('folderPath')
    };

    // 初始化右键菜单相关变量
    this.currentContextBookmark = null;
    this.hideTimer = null; // 延迟消失定时器
    this.menuVisible = false; // 菜单显示状态
    this.bookmarkRect = null; // 书签区域坐标
    this.menuRect = null; // 菜单区域坐标
    this.currentBookmarkElement = null; // 当前右键的书签元素
  }

  bindEvents() {
    // GitHub按钮
    this.elements.githubButton.addEventListener('click', () => this.openGitHub());

    // 主题切换
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // 主题颜色设置
    this.elements.themeSettings.addEventListener('click', () => this.toggleThemePanel());

    // 主题颜色预设点击
    const themeColorPresets = document.querySelectorAll('.theme-color-preset');
    themeColorPresets.forEach(preset => {
      preset.addEventListener('click', () => this.setThemeColor(preset.dataset.color));
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

    // 回到顶部按钮
    this.elements.backToTop.addEventListener('click', () => this.scrollToTop());

    // 键盘导航
    document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      if (!this.elements.themeSettings.contains(e.target) &&
          !this.elements.themePanel.contains(e.target)) {
        this.elements.themePanel.classList.remove('active');
      }
    });

    // 右键菜单事件
    this.elements.showFolderItem.addEventListener('click', () => this.showBookmarkFolder());
    this.elements.deleteBookmarkItem.addEventListener('click', () => this.deleteBookmark());

    // 阻止右键菜单的右键事件冒泡
    this.elements.contextMenu.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // 鼠标移动事件 - 用于联合区域检测
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    // 页面滚动事件 - 滚动时立即隐藏菜单
    this.elements.bookmarksContainer.addEventListener('scroll', (e) => {
      if (this.menuVisible) {
        this.hideContextMenuImmediately();
      }
    });
  }

  async initializeTheme() {
    try {
      const result = await chrome.storage.sync.get(['theme', 'themeColor']);
      const theme = result.theme || 'light';
      const themeColor = result.themeColor || 'blue';

      document.documentElement.setAttribute('data-theme', theme);
      this.updateThemeIcon(theme);
      this.setThemeColor(themeColor);
      this.updateThemeColorUI(themeColor);
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
    const icon = this.elements.themeToggle.querySelector('svg');
    const paths = {
      dark: 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.52,9.22 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.22 6.91,16.84 7.51,17.35L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.22 18.05,8.5C17.63,7.78 17.09,7.15 16.49,6.65L20.65,7M20.64,17L16.5,17.35C17.1,16.84 17.64,16.22 18.06,15.5C18.48,14.78 18.75,14 18.89,13.23L20.64,17Z',
      light: 'M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z'
    };
    icon.innerHTML = `<path d="${paths[theme] || paths.light}"/>`;
  }

  toggleThemePanel() {
    this.elements.themePanel.classList.toggle('active');
  }

  async setThemeColor(colorName) {
    const colorMap = {
      // 赤
      red: '#ef4444',
      // 橙
      orange: '#f97316',
      // 黄
      yellow: '#eab308',
      // 绿
      green: '#22c55e',
      // 青
      cyan: '#06b6d4',
      // 蓝
      blue: '#3b82f6',
      // 紫
      purple: '#8b5cf6'
    };

    const color = colorMap[colorName] || colorMap.blue;
    const root = document.documentElement;

    // 设置主题颜色CSS变量，影响多个元素
    root.style.setProperty('--button-color', color);
    root.style.setProperty('--title-color', color);

    // 设置焦点阴影颜色（带透明度）
    const focusShadowColor = this.hexToRgba(color, 0.1);
    root.style.setProperty('--focus-shadow-color', focusShadowColor);

    // 设置滚动条颜色
    this.setScrollbarColorByTheme(colorName);

    this.updateThemeColorUI(colorName);

    try {
      await chrome.storage.sync.set({ themeColor: colorName });
    } catch (error) {
      console.error('保存主题颜色设置失败:', error);
    }
  }

  updateThemeColorUI(colorName) {
    this.updateColorUI('.theme-color-preset', colorName);
  }

  setScrollbarColorByTheme(colorName) {
    const colorMap = {
      // 赤
      red: {
        track: 'rgba(239, 68, 68, 0.1)',
        thumb: 'rgba(239, 68, 68, 0.6)',
        thumbHover: 'rgba(220, 38, 38, 0.8)'
      },
      // 橙
      orange: {
        track: 'rgba(249, 115, 22, 0.1)',
        thumb: 'rgba(249, 115, 22, 0.6)',
        thumbHover: 'rgba(234, 88, 12, 0.8)'
      },
      // 黄
      yellow: {
        track: 'rgba(234, 179, 8, 0.1)',
        thumb: 'rgba(234, 179, 8, 0.6)',
        thumbHover: 'rgba(202, 138, 4, 0.8)'
      },
      // 绿
      green: {
        track: 'rgba(34, 197, 94, 0.1)',
        thumb: 'rgba(34, 197, 94, 0.6)',
        thumbHover: 'rgba(22, 163, 74, 0.8)'
      },
      // 青
      cyan: {
        track: 'rgba(6, 182, 212, 0.1)',
        thumb: 'rgba(6, 182, 212, 0.6)',
        thumbHover: 'rgba(8, 145, 178, 0.8)'
      },
      // 蓝
      blue: {
        track: 'rgba(59, 130, 246, 0.1)',
        thumb: 'rgba(59, 130, 246, 0.6)',
        thumbHover: 'rgba(37, 99, 235, 0.8)'
      },
      // 紫
      purple: {
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
  }

  // 通用的颜色UI更新方法
  updateColorUI(selector, colorName) {
    const presets = document.querySelectorAll(selector);
    presets.forEach(preset => {
      preset.classList.toggle('active', preset.dataset.color === colorName);
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
    // 同时添加loading类
    iconWrapper.className = 'bookmark-icon-wrapper loading';

    // 创建内层图标容器
    const iconContainer = document.createElement('div');
    iconContainer.className = 'bookmark-icon loading';

    // 解析URL获取域名和网站名称
    let hostname, siteName;
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
      // 移除www前缀
      siteName = hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = 'unknown';
      siteName = 'unknown';
    }

    const img = document.createElement('img');
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

    // 设置加载超时时间（毫秒）
    const LOAD_TIMEOUT = 500;
    let isLoaded = false;
    let timeoutId;

    // 成功加载处理
    img.onload = () => {
      if (!isLoaded) {
        isLoaded = true;
        clearTimeout(timeoutId);
        // 移除wrapper的loading类
        iconWrapper.classList.remove('loading');
        iconContainer.classList.remove('loading');
        iconContainer.classList.remove('error');
        iconContainer.classList.add('success');
      }
    };

    // 加载失败处理
    img.onerror = () => {
      if (!isLoaded) {
        isLoaded = true;
        clearTimeout(timeoutId);
        // 移除wrapper的loading类
        iconWrapper.classList.remove('loading');
        this.showFallbackIcon(iconContainer, siteName);
      }
    };

    // 超时处理
    timeoutId = setTimeout(() => {
      if (!isLoaded) {
        isLoaded = true;
        // 停止图片加载
        img.src = '';
        // 移除wrapper的loading类
        iconWrapper.classList.remove('loading');
        this.showFallbackIcon(iconContainer, siteName);
      }
    }, LOAD_TIMEOUT);

    img.src = faviconUrl;
    img.alt = '网站图标';
    iconContainer.appendChild(img);

    // 将图标容器放入包装器中
    iconWrapper.appendChild(iconContainer);

    return iconWrapper;
  }

  // 显示降级图标（网站首字母）
  showFallbackIcon(iconContainer, siteName) {
    iconContainer.classList.remove('loading');
    iconContainer.classList.add('fallback');
    
    // 获取网站首字母
    const initial = this.getSiteInitial(siteName);
    
    // 生成颜色（根据域名生成一致的颜色）
    const bgColor = this.generateColorFromText(siteName);
    
    iconContainer.innerHTML = `
      <div class="site-initial-icon" style="background-color: ${bgColor}">
        <span class="site-initial">${initial}</span>
      </div>
    `;
  }

  // 获取网站首字母
  getSiteInitial(siteName) {
    const customInitials = {
      'github.com': 'G', 'stackoverflow.com': 'SO', 'google.com': 'G',
      'baidu.com': '百', 'zhihu.com': '知', 'bilibili.com': 'B',
      'youtube.com': 'Y', 'twitter.com': 'T', 'facebook.com': 'F',
      'linkedin.com': 'in'
    };

    return customInitials[siteName] || siteName.split('.')[0].charAt(0).toUpperCase();
  }

  // 根据文本生成一致的颜色
  generateColorFromText(text) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#D2B4DE'
    ];

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
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

    // 控制回到顶部按钮的显示/隐藏
    this.toggleBackToTopButton(scrollTop);
  }


  async loadMoreBookmarks() {
    if (this.isLoading || !this.hasMoreData) return;
    
    this.isLoading = true;
    this.elements.loadingIndicator.classList.remove('hidden');
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.renderBookmarks();
    
    this.isLoading = false;
    this.elements.loadingIndicator.classList.add('hidden');
  }

  async handleContextMenu(e, bookmark) {
    try {
      e.preventDefault();
      e.stopPropagation();

      // 隐藏其他可能打开的菜单
      this.hideContextMenu();

      // 设置当前选中的书签
      this.currentContextBookmark = bookmark;

      // 获取并显示书签所在目录
      await this.updateFolderPath(bookmark.parentId);

      // 获取书签项目元素 - 多重回退策略
      let bookmarkElement = e.currentTarget;

      // 如果currentTarget不可用，尝试从target向上查找
      if (!bookmarkElement) {
        bookmarkElement = e.target?.closest('.bookmark-item');
      }

      // 安全检查：确保元素存在且有getBoundingClientRect方法
      if (!bookmarkElement || typeof bookmarkElement.getBoundingClientRect !== 'function') {
        console.warn('无法获取有效的书签元素，使用鼠标位置显示菜单');
        this.showContextMenuAtPosition(e.clientX, e.clientY);
        return;
      }

      // 保存当前书签元素引用
      this.currentBookmarkElement = bookmarkElement;

      // 显示右键菜单，基于鼠标位置定位
      this.showContextMenuAtPosition(e.clientX, e.clientY);
    } catch (error) {
      console.error('右键菜单处理出错:', error);
      // 出错时使用鼠标位置作为回退方案
      try {
        this.showContextMenuAtPosition(e.clientX, e.clientY);
      } catch (fallbackError) {
        console.error('回退方案也失败了:', fallbackError);
      }
    }
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

  // 将十六进制颜色转换为rgba格式
  hexToRgba(hex, alpha) {
    // 移除#号
    hex = hex.replace('#', '');

    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // 控制回到顶部按钮的显示/隐藏
  toggleBackToTopButton(scrollTop) {
    // 滚动超过200px时显示按钮
    const showThreshold = 200;

    // 清除之前的定时器
    if (this.backToTopTimer) {
      clearTimeout(this.backToTopTimer);
    }

    // 使用防抖，避免在平滑滚动过程中频繁切换
    this.backToTopTimer = setTimeout(() => {
      if (scrollTop > showThreshold) {
        this.elements.backToTop.classList.add('visible');
      } else {
        this.elements.backToTop.classList.remove('visible');
      }
    // 50ms防抖延迟
    }, 50);
  }

  // 回到顶部功能
  scrollToTop() {
    const container = this.elements.bookmarksContainer;
    container.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // 显示右键菜单
  showContextMenu(bookmarkElement) {
    // 安全检查
    if (!bookmarkElement) {
      console.error('书签元素为空，无法显示菜单');
      return;
    }

    const menu = this.elements.contextMenu;
    const container = this.elements.container;

    // 获取书签元素的位置信息
    const bookmarkRect = bookmarkElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 计算菜单的初始位置（相对于容器）
    let menuLeft = bookmarkRect.right - containerRect.left + 8; // 在书签右侧显示，留8px间距
    let menuTop = bookmarkRect.top - containerRect.top; // 与书签顶部对齐

    // 临时显示菜单以获取其尺寸（但保持不可见）
    menu.style.display = 'block';
    menu.style.visibility = 'hidden';
    menu.style.opacity = '0';

    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;

    // 滚动条宽度（6px + 一些额外边距）
    const scrollbarWidth = 10;

    // 计算可用宽度（减去滚动条宽度）
    const availableWidth = container.offsetWidth - scrollbarWidth;

    // 检查右侧是否有足够空间（考虑滚动条）
    if (menuLeft + menuWidth > availableWidth) {
      // 尝试显示在左侧
      const leftPosition = bookmarkRect.left - containerRect.left - menuWidth - 8;

      if (leftPosition >= 8) {
        // 左侧有足够空间
        menuLeft = leftPosition;
      } else {
        // 左右都不够，强制在可用区域内显示
        menuLeft = Math.max(8, availableWidth - menuWidth - 8);
      }
    }

    // 检查底部是否有足够空间，如果没有则向上调整
    if (menuTop + menuHeight > container.offsetHeight) {
      menuTop = container.offsetHeight - menuHeight - 8; // 距离底部8px
    }

    // 确保菜单不会超出顶部
    if (menuTop < 8) {
      menuTop = 8; // 距离顶部8px
    }

    // 最终确保菜单不会超出可用区域
    if (menuLeft < 8) {
      menuLeft = 8; // 距离左侧8px
    }

    if (menuLeft + menuWidth > availableWidth) {
      menuLeft = availableWidth - menuWidth - 8; // 确保不遮盖滚动条
    }

    // 设置最终位置
    menu.style.left = `${menuLeft}px`;
    menu.style.top = `${menuTop}px`;

    // 显示菜单 - 使用CSS类控制显示状态
    menu.classList.add('visible');

    // 清除临时的内联样式，让CSS类完全控制
    menu.style.visibility = '';
    menu.style.opacity = '';

    // 设置菜单显示状态和联合区域坐标
    this.menuVisible = true;
    this.updateUnionArea();
  }

  // 隐藏右键菜单
  hideContextMenu() {
    const menu = this.elements.contextMenu;

    // 移除visible类
    menu.classList.remove('visible');

    // 清除内联样式，让CSS类完全控制显示状态
    menu.style.visibility = '';
    menu.style.opacity = '';
    menu.style.left = '';
    menu.style.top = '';

    // 重置状态变量
    this.menuVisible = false;
    this.currentContextBookmark = null;
    this.currentBookmarkElement = null;
    this.bookmarkRect = null;
    this.menuRect = null;

    // 清除延迟定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  // 立即隐藏右键菜单（用于滚动等情况）
  hideContextMenuImmediately() {
    this.hideContextMenu();
  }

  // 回退方法：基于鼠标位置显示菜单
  showContextMenuAtPosition(x, y) {
    try {
      const menu = this.elements.contextMenu;
      const container = this.elements.container;

      // 安全检查
      if (!menu || !container) {
        console.error('菜单或容器元素不存在');
        return;
      }

      // 获取容器位置信息
      const containerRect = container.getBoundingClientRect();

      // 计算相对于容器的位置
      let menuLeft = x - containerRect.left;
      let menuTop = y - containerRect.top;

      // 临时显示菜单以获取其尺寸（但保持不可见）
      menu.style.display = 'block';
      menu.style.visibility = 'hidden';
      menu.style.opacity = '0';

      const menuRect = menu.getBoundingClientRect();
      const menuWidth = menuRect.width;
      const menuHeight = menuRect.height;

      // 滚动条宽度（6px + 一些额外边距）
      const scrollbarWidth = 10;

      // 计算可用宽度（减去滚动条宽度）
      const availableWidth = container.offsetWidth - scrollbarWidth;

      // 确保菜单不会超出容器边界（考虑滚动条）
      if (menuLeft + menuWidth > availableWidth) {
        menuLeft = availableWidth - menuWidth - 8;
      }

      if (menuTop + menuHeight > container.offsetHeight) {
        menuTop = container.offsetHeight - menuHeight - 8;
      }

      // 确保菜单不会超出左侧和顶部
      if (menuLeft < 8) {
        menuLeft = 8;
      }

      if (menuTop < 8) {
        menuTop = 8;
      }

      // 最终确保不遮盖滚动条
      if (menuLeft + menuWidth > availableWidth) {
        menuLeft = availableWidth - menuWidth - 8;
      }

      // 设置最终位置
      menu.style.left = `${menuLeft}px`;
      menu.style.top = `${menuTop}px`;

      // 显示菜单 - 使用CSS类控制显示状态
      menu.classList.add('visible');

      // 清除临时的内联样式，让CSS类完全控制
      menu.style.visibility = '';
      menu.style.opacity = '';

      // 设置菜单显示状态
      this.menuVisible = true;

      // 对于回退方案，只更新菜单区域坐标
      this.menuRect = menu.getBoundingClientRect();
      if (this.currentBookmarkElement) {
        this.bookmarkRect = this.currentBookmarkElement.getBoundingClientRect();
      }
    } catch (error) {
      console.error('显示右键菜单时出错:', error);
    }
  }

  // 获取并更新书签所在目录路径
  async updateFolderPath(parentId) {
    try {
      const folderPath = await this.getBookmarkFolderPath(parentId);
      this.elements.folderPath.textContent = folderPath;
    } catch (error) {
      console.error('获取目录路径失败:', error);
      this.elements.folderPath.textContent = '未知目录';
    }
  }

  // 递归获取书签目录路径
  async getBookmarkFolderPath(folderId) {
    if (!folderId || folderId === '0') {
      return '书签栏';
    }

    try {
      const folders = await chrome.bookmarks.get(folderId);
      if (folders.length === 0) {
        return '未知目录';
      }

      const folder = folders[0];
      if (!folder.parentId || folder.parentId === '0') {
        return folder.title || '书签栏';
      }

      const parentPath = await this.getBookmarkFolderPath(folder.parentId);
      return `${parentPath} > ${folder.title}`;
    } catch (error) {
      console.error('获取目录信息失败:', error);
      return '未知目录';
    }
  }

  // 显示书签所在目录（在书签管理器中）
  async showBookmarkFolder() {
    if (!this.currentContextBookmark) return;

    try {
      // 打开书签管理器并定位到指定目录
      const url = `chrome://bookmarks/?id=${this.currentContextBookmark.parentId}`;
      await chrome.tabs.create({ url });
      window.close();
    } catch (error) {
      console.error('打开书签目录失败:', error);
    }

    this.hideContextMenu();
  }

  // 删除书签
  async deleteBookmark() {
    if (!this.currentContextBookmark) return;

    try {
      // 删除书签
      await chrome.bookmarks.remove(this.currentContextBookmark.id);

      // 从本地数组中移除
      this.bookmarks = this.bookmarks.filter(b => b.id !== this.currentContextBookmark.id);
      this.filteredBookmarks = this.filteredBookmarks.filter(b => b.id !== this.currentContextBookmark.id);

      // 重新渲染书签列表
      this.elements.bookmarksList.innerHTML = '';
      this.renderBookmarks(true);

      console.log('书签删除成功');
    } catch (error) {
      console.error('删除书签失败:', error);
    }

    this.hideContextMenu();
  }

  // 更新联合区域坐标
  updateUnionArea() {
    if (!this.currentBookmarkElement || !this.menuVisible) {
      return;
    }

    try {
      // 获取书签元素的坐标
      this.bookmarkRect = this.currentBookmarkElement.getBoundingClientRect();

      // 获取菜单元素的坐标
      this.menuRect = this.elements.contextMenu.getBoundingClientRect();
    } catch (error) {
      console.error('更新联合区域坐标失败:', error);
    }
  }

  // 检查鼠标是否在联合区域内
  isMouseInUnionArea(mouseX, mouseY) {
    if (!this.bookmarkRect || !this.menuRect) {
      return false;
    }

    // 检查是否在书签区域内
    const inBookmarkArea = (
      mouseX >= this.bookmarkRect.left &&
      mouseX <= this.bookmarkRect.right &&
      mouseY >= this.bookmarkRect.top &&
      mouseY <= this.bookmarkRect.bottom
    );

    // 检查是否在菜单区域内
    const inMenuArea = (
      mouseX >= this.menuRect.left &&
      mouseX <= this.menuRect.right &&
      mouseY >= this.menuRect.top &&
      mouseY <= this.menuRect.bottom
    );

    return inBookmarkArea || inMenuArea;
  }

  // 处理鼠标移动事件
  handleMouseMove(e) {
    if (!this.menuVisible) {
      return;
    }

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 检查鼠标是否在联合区域内
    const inUnionArea = this.isMouseInUnionArea(mouseX, mouseY);

    if (inUnionArea) {
      // 鼠标在联合区域内，清除延迟定时器
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
    } else {
      // 鼠标离开联合区域，启动延迟消失
      if (!this.hideTimer) {
        this.startHideTimer();
      }
    }
  }

  // 启动延迟消失定时器
  startHideTimer() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.hideTimer = setTimeout(() => {
      this.hideContextMenu();
    }, 300); // 300ms延迟
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