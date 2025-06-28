class WebOS {
  constructor() {
    this.windows = new Map();
    this.windowZIndex = 100;
    this.activeWindow = null;
    this.startMenuOpen = false;
    this.draggedWindow = null;
    this.dragOffset = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.currentDate = new Date();
    this.fileSystem = this.initFileSystem();
    this.terminalHistory = [];
    this.terminalHistoryIndex = -1;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateClock();
    this.generateCalendar();
    setInterval(() => this.updateClock(), 1000);
  }

  initFileSystem() {
    return {
      '/': {
        type: 'folder',
        children: {
          'Documents': {
            type: 'folder',
            children: {
              'readme.txt': { type: 'file', content: 'Welcome to WebOS!\n\nThis is a sample text file.' },
              'notes.txt': { type: 'file', content: 'My personal notes...' }
            }
          },
          'Pictures': {
            type: 'folder',
            children: {
              'wallpaper.jpg': { type: 'file', content: 'Image file' },
              'photo1.png': { type: 'file', content: 'Image file' }
            }
          },
          'Music': {
            type: 'folder',
            children: {
              'song1.mp3': { type: 'file', content: 'Audio file' },
              'playlist.m3u': { type: 'file', content: 'Playlist file' }
            }
          },
          'Desktop': { type: 'folder', children: {} }
        }
      }
    };
  }

  setupEventListeners() {
    // Desktop icon double-click
    document.querySelectorAll('.desktop-icon').forEach(icon => {
      let clickCount = 0;
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        clickCount++;
        
        // Clear previous selection
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
        
        setTimeout(() => {
          if (clickCount === 2) {
            this.openApplication(icon.dataset.app);
          }
          clickCount = 0;
        }, 300);
      });
    });

    // Start menu
    document.getElementById('start-button').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleStartMenu();
    });

    // Start menu app items
    document.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', () => {
        this.openApplication(item.dataset.app);
        this.hideStartMenu();
      });
    });

    // System tray icons
    document.getElementById('wifi-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTrayPopup('wifi-popup');
    });

    document.getElementById('volume-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTrayPopup('volume-popup');
    });

    document.getElementById('battery-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTrayPopup('battery-popup');
    });

    // Clock calendar
    document.getElementById('clock').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCalendar();
    });

    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.generateCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.generateCalendar();
    });

    // Volume slider
    document.getElementById('volume-slider').addEventListener('input', (e) => {
      document.getElementById('volume-value').textContent = e.target.value + '%';
    });

    // Search functionality
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Global click handler
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.start-menu') && !e.target.closest('#start-button')) {
        this.hideStartMenu();
      }
      
      if (!e.target.closest('.tray-popup') && !e.target.closest('.tray-icon')) {
        this.hideAllTrayPopups();
      }
      
      if (!e.target.closest('.calendar-popup') && !e.target.closest('#clock')) {
        this.hideCalendar();
      }

      // Clear desktop icon selection
      if (e.target.closest('#desktop') && !e.target.closest('.desktop-icon')) {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      }
    });

    // Window management
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        this.toggleStartMenu();
      }
    });

    // Power button
    document.getElementById('power-button').addEventListener('click', () => {
      this.showPowerOptions();
    });

    // Context menu
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#desktop') && !e.target.closest('.window')) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY);
      }
    });
  }

  openApplication(appName) {
    if (this.windows.has(appName)) {
      this.focusWindow(appName);
      return;
    }

    const windowId = this.createWindow(appName);
    this.windows.set(appName, windowId);
    this.addToTaskbar(appName, windowId);
  }

  createWindow(appName) {
    const windowId = `window-${Date.now()}`;
    const window = document.createElement('div');
    window.className = 'window active';
    window.id = windowId;
    window.style.left = `${50 + this.windows.size * 30}px`;
    window.style.top = `${50 + this.windows.size * 30}px`;
    window.style.width = '600px';
    window.style.height = '400px';
    window.style.zIndex = ++this.windowZIndex;

    const appConfig = this.getAppConfig(appName);
    
    window.innerHTML = `
      <div class="window-header" data-window-id="${windowId}">
        <div class="window-title">
          <span class="app-icon ${appConfig.iconClass}"></span>
          ${appConfig.title}
        </div>
        <div class="window-controls">
          <div class="window-control minimize" data-action="minimize" data-window-id="${windowId}"></div>
          <div class="window-control maximize" data-action="maximize" data-window-id="${windowId}"></div>
          <div class="window-control close" data-action="close" data-window-id="${windowId}"></div>
        </div>
      </div>
      <div class="window-content">
        ${appConfig.content}
      </div>
    `;

    document.getElementById('windows-container').appendChild(window);
    this.activeWindow = windowId;
    
    // Setup window controls
    this.setupWindowControls(windowId);
    
    // Setup app-specific functionality
    this.setupAppFunctionality(appName, windowId);

    return windowId;
  }

  getAppConfig(appName) {
    const configs = {
      'file-manager': {
        title: 'File Manager',
        iconClass: 'folder-icon',
        content: this.getFileManagerContent()
      },
      'text-editor': {
        title: 'Text Editor',
        iconClass: 'text-editor-icon',
        content: this.getTextEditorContent()
      },
      'calculator': {
        title: 'Calculator',
        iconClass: 'calculator-icon',
        content: this.getCalculatorContent()
      },
      'browser': {
        title: 'Web Browser',
        iconClass: 'browser-icon',
        content: this.getBrowserContent()
      },
      'settings': {
        title: 'Settings',
        iconClass: 'settings-icon',
        content: this.getSettingsContent()
      },
      'terminal': {
        title: 'Terminal',
        iconClass: 'terminal-icon',
        content: this.getTerminalContent()
      },
      'music-player': {
        title: 'Music Player',
        iconClass: 'music-icon',
        content: this.getMusicPlayerContent()
      },
      'image-viewer': {
        title: 'Image Viewer',
        iconClass: 'image-icon',
        content: this.getImageViewerContent()
      }
    };

    return configs[appName] || { title: 'Unknown App', iconClass: '', content: '<p>App not found</p>' };
  }

  getFileManagerContent() {
    return `
      <div class="file-manager-toolbar">
        <button class="toolbar-button" onclick="webOS.navigateBack()">← Back</button>
        <button class="toolbar-button" onclick="webOS.navigateForward()">Forward →</button>
        <button class="toolbar-button" onclick="webOS.refreshFiles()">🔄 Refresh</button>
        <button class="toolbar-button" onclick="webOS.createNewFolder()">📁 New Folder</button>
      </div>
      <div class="file-list" id="file-list">
        ${this.generateFileList('/')}
      </div>
    `;
  }

  generateFileList(path) {
    const pathParts = path.split('/').filter(p => p);
    let currentDir = this.fileSystem['/'];
    
    for (const part of pathParts) {
      if (currentDir.children && currentDir.children[part]) {
        currentDir = currentDir.children[part];
      }
    }

    let html = '';
    if (path !== '/') {
      html += `
        <div class="file-item" onclick="webOS.navigateToParent()">
          <span class="file-icon">📁</span>
          <span class="file-name">..</span>
        </div>
      `;
    }

    if (currentDir.children) {
      for (const [name, item] of Object.entries(currentDir.children)) {
        const icon = item.type === 'folder' ? '📁' : '📄';
        html += `
          <div class="file-item" onclick="webOS.selectFile('${name}', '${item.type}')">
            <span class="file-icon">${icon}</span>
            <span class="file-name">${name}</span>
          </div>
        `;
      }
    }

    return html;
  }

  getTextEditorContent() {
    return `
      <div class="text-editor-toolbar">
        <button class="toolbar-button" onclick="webOS.newDocument()">New</button>
        <button class="toolbar-button" onclick="webOS.openDocument()">Open</button>
        <button class="toolbar-button" onclick="webOS.saveDocument()">Save</button>
        <button class="toolbar-button" onclick="webOS.copyText()">Copy</button>
        <button class="toolbar-button" onclick="webOS.pasteText()">Paste</button>
      </div>
      <textarea class="text-editor-content" id="text-editor-content" placeholder="Start typing..."></textarea>
    `;
  }

  getCalculatorContent() {
    return `
      <div class="calculator-display" id="calculator-display">0</div>
      <div class="calculator-grid">
        <button class="calculator-button" onclick="webOS.clearCalculator()">C</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('±')">±</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('%')">%</button>
        <button class="calculator-button operator" onclick="webOS.calculatorInput('/')">÷</button>
        
        <button class="calculator-button" onclick="webOS.calculatorInput('7')">7</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('8')">8</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('9')">9</button>
        <button class="calculator-button operator" onclick="webOS.calculatorInput('*')">×</button>
        
        <button class="calculator-button" onclick="webOS.calculatorInput('4')">4</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('5')">5</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('6')">6</button>
        <button class="calculator-button operator" onclick="webOS.calculatorInput('-')">−</button>
        
        <button class="calculator-button" onclick="webOS.calculatorInput('1')">1</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('2')">2</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('3')">3</button>
        <button class="calculator-button operator" onclick="webOS.calculatorInput('+')">+</button>
        
        <button class="calculator-button" onclick="webOS.calculatorInput('0')" style="grid-column: span 2;">0</button>
        <button class="calculator-button" onclick="webOS.calculatorInput('.')">.</button>
        <button class="calculator-button operator" onclick="webOS.calculateResult()">=</button>
      </div>
    `;
  }

  getBrowserContent() {
    return `
      <div class="browser-toolbar">
        <button class="toolbar-button" onclick="webOS.browserBack()">←</button>
        <button class="toolbar-button" onclick="webOS.browserForward()">→</button>
        <button class="toolbar-button" onclick="webOS.browserRefresh()">🔄</button>
        <input type="text" class="browser-url" id="browser-url" value="https://example.com" placeholder="Enter URL...">
        <button class="toolbar-button" onclick="webOS.browserGo()">Go</button>
      </div>
      <div class="browser-content" id="browser-content">
        <h1>Welcome to WebOS Browser</h1>
        <p>This is a simple browser simulation. You can navigate to different pages:</p>
        <ul>
          <li><a href="#" onclick="webOS.loadPage('home')">Home</a></li>
          <li><a href="#" onclick="webOS.loadPage('about')">About</a></li>
          <li><a href="#" onclick="webOS.loadPage('contact')">Contact</a></li>
        </ul>
      </div>
    `;
  }

  getSettingsContent() {
    return `
      <h2>System Settings</h2>
      <div style="margin-top: 20px;">
        <h3>Display</h3>
        <label>
          <input type="range" min="50" max="150" value="100" onchange="webOS.changeZoom(this.value)">
          Zoom: <span id="zoom-value">100%</span>
        </label>
        
        <h3 style="margin-top: 20px;">Theme</h3>
        <label>
          <input type="radio" name="theme" value="light" onchange="webOS.changeTheme('light')"> Light
        </label>
        <label>
          <input type="radio" name="theme" value="dark" checked onchange="webOS.changeTheme('dark')"> Dark
        </label>
        
        <h3 style="margin-top: 20px;">System Info</h3>
        <p>WebOS Version: 1.0.0</p>
        <p>Browser: ${navigator.userAgent}</p>
        <p>Screen Resolution: ${screen.width}x${screen.height}</p>
      </div>
    `;
  }

  getTerminalContent() {
    return `
      <div class="terminal-output" id="terminal-output">
        <div>WebOS Terminal v1.0.0</div>
        <div>Type 'help' for available commands.</div>
        <div></div>
      </div>
      <div class="terminal-input">
        <span class="terminal-prompt">user@webos:~$</span>
        <input type="text" id="terminal-input" onkeydown="webOS.handleTerminalInput(event)">
      </div>
    `;
  }

  getMusicPlayerContent() {
    return `
      <h2>Music Player</h2>
      <div style="text-align: center; margin-top: 40px;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎵</div>
        <h3>Now Playing</h3>
        <p>No music selected</p>
        <div style="margin: 20px 0;">
          <button class="toolbar-button" onclick="webOS.musicPrevious()">⏮️</button>
          <button class="toolbar-button" onclick="webOS.musicPlay()">▶️</button>
          <button class="toolbar-button" onclick="webOS.musicNext()">⏭️</button>
        </div>
        <input type="range" style="width: 100%; margin: 20px 0;" value="0">
        <div>
          <small>0:00 / 0:00</small>
        </div>
      </div>
    `;
  }

  getImageViewerContent() {
    return `
      <h2>Image Viewer</h2>
      <div style="text-align: center; margin-top: 40px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🖼️</div>
        <p>No image selected</p>
        <button class="toolbar-button" onclick="webOS.openImage()">Open Image</button>
      </div>
    `;
  }

  setupWindowControls(windowId) {
    const window = document.getElementById(windowId);
    
    // Window control buttons
    window.querySelectorAll('.window-control').forEach(control => {
      control.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = control.dataset.action;
        
        switch (action) {
          case 'minimize':
            this.minimizeWindow(windowId);
            break;
          case 'maximize':
            this.toggleMaximizeWindow(windowId);
            break;
          case 'close':
            this.closeWindow(windowId);
            break;
        }
      });
    });

    // Window focus
    window.addEventListener('mousedown', () => {
      this.focusWindow(windowId);
    });
  }

  setupAppFunctionality(appName, windowId) {
    switch (appName) {
      case 'calculator':
        this.calculatorState = {
          display: '0',
          previousValue: null,
          operation: null,
          waitingForNewValue: false
        };
        break;
      case 'terminal':
        setTimeout(() => {
          document.getElementById('terminal-input')?.focus();
        }, 100);
        break;
    }
  }

  focusWindow(windowId) {
    if (typeof windowId === 'string' && !windowId.startsWith('window-')) {
      // If it's an app name, find the window ID
      for (const [appName, id] of this.windows.entries()) {
        if (appName === windowId) {
          windowId = id;
          break;
        }
      }
    }

    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    const window = document.getElementById(windowId);
    if (window) {
      window.classList.add('active');
      window.style.zIndex = ++this.windowZIndex;
      this.activeWindow = windowId;
      
      // Update taskbar
      document.querySelectorAll('.taskbar-app').forEach(app => app.classList.remove('active'));
      const taskbarApp = document.querySelector(`[data-window-id="${windowId}"]`);
      if (taskbarApp) {
        taskbarApp.classList.add('active');
      }
    }
  }

  minimizeWindow(windowId) {
    const window = document.getElementById(windowId);
    if (window) {
      window.classList.add('minimized');
      
      // Update taskbar
      const taskbarApp = document.querySelector(`[data-window-id="${windowId}"]`);
      if (taskbarApp) {
        taskbarApp.classList.remove('active');
      }
    }
  }

  toggleMaximizeWindow(windowId) {
    const window = document.getElementById(windowId);
    if (window) {
      window.classList.toggle('maximized');
    }
  }

  closeWindow(windowId) {
    const window = document.getElementById(windowId);
    if (window) {
      window.remove();
      
      // Remove from windows map
      for (const [appName, id] of this.windows.entries()) {
        if (id === windowId) {
          this.windows.delete(appName);
          break;
        }
      }
      
      // Remove from taskbar
      const taskbarApp = document.querySelector(`[data-window-id="${windowId}"]`);
      if (taskbarApp) {
        taskbarApp.remove();
      }
    }
  }

  addToTaskbar(appName, windowId) {
    const taskbarApps = document.getElementById('taskbar-apps');
    const appConfig = this.getAppConfig(appName);
    
    const taskbarApp = document.createElement('button');
    taskbarApp.className = 'taskbar-app active';
    taskbarApp.dataset.windowId = windowId;
    taskbarApp.innerHTML = `
      <span class="app-icon ${appConfig.iconClass}"></span>
      ${appConfig.title}
    `;
    
    taskbarApp.addEventListener('click', () => {
      const window = document.getElementById(windowId);
      if (window.classList.contains('minimized')) {
        window.classList.remove('minimized');
        this.focusWindow(windowId);
      } else if (this.activeWindow === windowId) {
        this.minimizeWindow(windowId);
      } else {
        this.focusWindow(windowId);
      }
    });
    
    taskbarApps.appendChild(taskbarApp);
  }

  handleMouseDown(e) {
    const windowHeader = e.target.closest('.window-header');
    if (windowHeader) {
      const windowId = windowHeader.dataset.windowId;
      const window = document.getElementById(windowId);
      
      if (window && !window.classList.contains('maximized')) {
        this.draggedWindow = window;
        const rect = window.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        this.focusWindow(windowId);
        e.preventDefault();
      }
    }
  }

  handleMouseMove(e) {
    if (this.draggedWindow) {
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      this.draggedWindow.style.left = Math.max(0, Math.min(newX, window.innerWidth - 200)) + 'px';
      this.draggedWindow.style.top = Math.max(0, Math.min(newY, window.innerHeight - 100)) + 'px';
    }
  }

  handleMouseUp(e) {
    this.draggedWindow = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    if (this.startMenuOpen) {
      this.hideStartMenu();
    } else {
      startMenu.classList.add('show');
      startButton.classList.add('active');
      this.startMenuOpen = true;
    }
  }

  hideStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    
    startMenu.classList.remove('show');
    startButton.classList.remove('active');
    this.startMenuOpen = false;
  }

  toggleTrayPopup(popupId) {
    this.hideAllTrayPopups();
    const popup = document.getElementById(popupId);
    if (popup) {
      popup.classList.add('show');
    }
  }

  hideAllTrayPopups() {
    document.querySelectorAll('.tray-popup').forEach(popup => {
      popup.classList.remove('show');
    });
  }

  toggleCalendar() {
    const calendar = document.getElementById('calendar-popup');
    if (calendar.classList.contains('show')) {
      this.hideCalendar();
    } else {
      calendar.classList.add('show');
    }
  }

  hideCalendar() {
    document.getElementById('calendar-popup').classList.remove('show');
  }

  updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString();
    
    document.querySelector('.time').textContent = timeString;
    document.querySelector('.date').textContent = dateString;
  }

  generateCalendar() {
    const calendar = document.getElementById('calendar-grid');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('current-month').textContent = 
      `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const today = new Date();
    
    let html = '';
    
    // Weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      html += `<div class="calendar-day calendar-weekday">${day}</div>`;
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += '<div class="calendar-day"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const isToday = today.getDate() === day && 
                     today.getMonth() === this.currentDate.getMonth() && 
                     today.getFullYear() === this.currentDate.getFullYear();
      
      html += `<div class="calendar-day ${isToday ? 'today' : ''}">${day}</div>`;
    }
    
    calendar.innerHTML = html;
  }

  handleSearch(query) {
    if (!query.trim()) return;
    
    // Simple search simulation
    console.log('Searching for:', query);
  }

  // Calculator functions
  calculatorInput(value) {
    const display = document.getElementById('calculator-display');
    
    if (['+', '-', '*', '/'].includes(value)) {
      if (this.calculatorState.operation && !this.calculatorState.waitingForNewValue) {
        this.calculateResult();
      }
      this.calculatorState.previousValue = parseFloat(this.calculatorState.display);
      this.calculatorState.operation = value;
      this.calculatorState.waitingForNewValue = true;
    } else if (value === '.') {
      if (this.calculatorState.display.indexOf('.') === -1) {
        this.calculatorState.display += '.';
      }
    } else if (value === '±') {
      this.calculatorState.display = (parseFloat(this.calculatorState.display) * -1).toString();
    } else if (value === '%') {
      this.calculatorState.display = (parseFloat(this.calculatorState.display) / 100).toString();
    } else {
      if (this.calculatorState.waitingForNewValue) {
        this.calculatorState.display = value;
        this.calculatorState.waitingForNewValue = false;
      } else {
        this.calculatorState.display = this.calculatorState.display === '0' ? value : this.calculatorState.display + value;
      }
    }
    
    display.textContent = this.calculatorState.display;
  }

  calculateResult() {
    const display = document.getElementById('calculator-display');
    const current = parseFloat(this.calculatorState.display);
    const previous = this.calculatorState.previousValue;
    const operation = this.calculatorState.operation;
    
    if (previous !== null && operation) {
      let result;
      switch (operation) {
        case '+': result = previous + current; break;
        case '-': result = previous - current; break;
        case '*': result = previous * current; break;
        case '/': result = current !== 0 ? previous / current : 0; break;
        default: result = current;
      }
      
      this.calculatorState.display = result.toString();
      this.calculatorState.previousValue = null;
      this.calculatorState.operation = null;
      this.calculatorState.waitingForNewValue = true;
      
      display.textContent = this.calculatorState.display;
    }
  }

  clearCalculator() {
    this.calculatorState = {
      display: '0',
      previousValue: null,
      operation: null,
      waitingForNewValue: false
    };
    document.getElementById('calculator-display').textContent = '0';
  }

  // Terminal functions
  handleTerminalInput(event) {
    if (event.key === 'Enter') {
      const input = event.target;
      const command = input.value.trim();
      const output = document.getElementById('terminal-output');
      
      // Add command to output
      output.innerHTML += `<div>user@webos:~$ ${command}</div>`;
      
      // Process command
      const result = this.processTerminalCommand(command);
      if (result) {
        output.innerHTML += `<div>${result}</div>`;
      }
      
      // Add to history
      if (command) {
        this.terminalHistory.push(command);
        this.terminalHistoryIndex = this.terminalHistory.length;
      }
      
      // Clear input and scroll to bottom
      input.value = '';
      output.scrollTop = output.scrollHeight;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.terminalHistoryIndex > 0) {
        this.terminalHistoryIndex--;
        event.target.value = this.terminalHistory[this.terminalHistoryIndex];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.terminalHistoryIndex < this.terminalHistory.length - 1) {
        this.terminalHistoryIndex++;
        event.target.value = this.terminalHistory[this.terminalHistoryIndex];
      } else {
        this.terminalHistoryIndex = this.terminalHistory.length;
        event.target.value = '';
      }
    }
  }

  processTerminalCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case 'help':
        return `Available commands:
help - Show this help message
ls - List files and directories
pwd - Show current directory
date - Show current date and time
echo - Echo text
clear - Clear terminal
whoami - Show current user
uname - Show system information
calc - Simple calculator (e.g., calc 2+2)`;
      
      case 'ls':
        return 'Documents  Pictures  Music  Desktop';
      
      case 'pwd':
        return '/home/user';
      
      case 'date':
        return new Date().toString();
      
      case 'echo':
        return parts.slice(1).join(' ');
      
      case 'clear':
        document.getElementById('terminal-output').innerHTML = '';
        return '';
      
      case 'whoami':
        return 'user';
      
      case 'uname':
        return 'WebOS 1.0.0';
      
      case 'calc':
        const expression = parts.slice(1).join('');
        try {
          // Simple math evaluation (be careful with eval in real applications)
          const result = Function('"use strict"; return (' + expression + ')')();
          return `${expression} = ${result}`;
        } catch (e) {
          return 'Error: Invalid expression';
        }
      
      default:
        return `Command not found: ${cmd}. Type 'help' for available commands.`;
    }
  }

  // File Manager functions
  selectFile(name, type) {
    if (type === 'folder') {
      // Navigate to folder
      console.log('Opening folder:', name);
    } else {
      // Open file
      console.log('Opening file:', name);
    }
  }

  // Text Editor functions
  newDocument() {
    document.getElementById('text-editor-content').value = '';
  }

  saveDocument() {
    const content = document.getElementById('text-editor-content').value;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Browser functions
  loadPage(page) {
    const content = document.getElementById('browser-content');
    const pages = {
      home: '<h1>Home Page</h1><p>Welcome to the home page!</p>',
      about: '<h1>About</h1><p>This is the about page of WebOS Browser.</p>',
      contact: '<h1>Contact</h1><p>Contact us at: contact@webos.com</p>'
    };
    
    content.innerHTML = pages[page] || '<h1>Page Not Found</h1>';
    document.getElementById('browser-url').value = `https://webos.com/${page}`;
  }

  // Settings functions
  changeZoom(value) {
    document.getElementById('zoom-value').textContent = value + '%';
    document.body.style.zoom = value + '%';
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  // Music Player functions
  musicPlay() {
    console.log('Playing music...');
  }

  musicPrevious() {
    console.log('Previous track...');
  }

  musicNext() {
    console.log('Next track...');
  }

  // Power functions
  showPowerOptions() {
    if (confirm('Do you want to shut down WebOS?')) {
      document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: black; color: white; font-size: 24px;">WebOS is shutting down...</div>';
      setTimeout(() => {
        location.reload();
      }, 2000);
    }
  }

  // Context menu
  showContextMenu(x, y) {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu show';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    menu.innerHTML = `
      <div class="context-menu-item" onclick="webOS.refreshDesktop()">Refresh</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" onclick="webOS.openApplication('settings')">Settings</div>
      <div class="context-menu-item" onclick="webOS.openApplication('terminal')">Open Terminal</div>
    `;
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', function removeMenu() {
        menu.remove();
        document.removeEventListener('click', removeMenu);
      });
    }, 0);
  }

  refreshDesktop() {
    console.log('Desktop refreshed');
  }
}

// Initialize WebOS when page loads
let webOS;
document.addEventListener('DOMContentLoaded', () => {
  webOS = new WebOS();
});