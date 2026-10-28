(() => {
  'use strict';
  if (window.self !== window.top) return;

  const routeNames = {
    dashboard: 'welcome.php',
    search: 'student_search.php',
    edit: 'student_sedit.php',
    fee: 'studentfee.php',
    reports: 'student_dynamicn.php'
  };
  const pathname = window.location.pathname;
  const page = Object.keys(routeNames).find((key) => pathname.includes(routeNames[key])) ||
    (pathname.includes('student_sedit.php') || pathname.includes('studentedit.php') ? 'edit' : null);
  const html = document.documentElement;

  if (!page) {
    html.classList.add('erp-native-page');
    return;
  }

  const debug = new URLSearchParams(window.location.search).get('erp_ui_debug') === '1';
  const userRole = (window.AndroidBridge && window.AndroidBridge.getUserRole) ? window.AndroidBridge.getUserRole() : 'admin';
  if ((userRole === 'user' || userRole === 'class') && page !== 'dashboard' && page !== 'edit' && page !== 'reports') {
    window.location.replace('welcome.php');
    return;
  }
  const bodyText = (document.body?.innerText || '').toLowerCase();
  if (bodyText.includes('click here to login') || bodyText.includes('logged in first')) {
    window.location.replace('index.php');
    return;
  }

  const app = {
    page,
    userRole,
    routes: routeNames,
    debug,
    root: null,
    content: null,
    originalMain: null,
    nativeNav: null,
    search: null,
    enabled: true,
    ready: false,
    log(message, detail) {
      if (debug) console.debug('[TSVH ERP App]', message, detail || '');
    },
    fail(reason) {
      console.error('[TSVH ERP App] Restoring original ERP view:', reason);
      app.cancelStartupTimeout?.();
      if (app.originalMain?.parent && app.originalMain.node?.parentNode !== app.originalMain.parent) {
        app.originalMain.parent.insertBefore(app.originalMain.node, app.originalMain.nextSibling);
      }
      app.disposeShellUi?.();
      app.root?.remove();
      html.classList.remove('erp-modern-pending', 'erp-modern-active');
      html.classList.add('erp-native-page');
    },
    disable() {
      app.fail('Disabled');
    },
    markReady() {
      app.ready = true;
      html.classList.remove('erp-modern-pending');
      html.classList.add('erp-modern-active');
      if (window.AndroidBridge && window.AndroidBridge.onAppReady) {
        try { window.AndroidBridge.onAppReady(); } catch (e) {}
      }
    }
  };
  window.__SCHOOL_ERP_CONSOLE__ = app;
  html.classList.add('erp-modern-pending');

  function createRoot() {
    if (!app.root || !document.getElementById('erp-modern-shell')) {
      const root = document.createElement('div');
      root.id = 'erp-modern-shell';
      root.setAttribute('data-page', page);
      root.setAttribute('data-user-role', userRole);
      root.setAttribute('aria-live', 'off');
      root.innerHTML = '<div class="erp-boot-skeleton"><div class="erp-skeleton-topbar"><i></i><span></span><span></span><span></span><b></b></div><div class="erp-skeleton-search"><i></i><span></span><small></small></div><div class="erp-skeleton-heading"><i></i><small></small></div><div class="erp-skeleton-grid"><i><b></b><span></span><small></small></i><i><b></b><span></span><small></small></i><i><b></b><span></span><small></small></i></div><div class="erp-skeleton-card"></div></div>';
      (document.body || html).appendChild(root);
      app.root = root;
      app.log('Early shell root mounted', page);
    }
    if (document.body && app.root.parentNode !== document.body) {
      document.body.insertBefore(app.root, document.body.firstChild);
    }
  }

  createRoot();
  if (app.root.parentNode !== document.body) {
    const observer = new MutationObserver(() => {
      createRoot();
      if (app.root.parentNode === document.body) observer.disconnect();
    });
    observer.observe(html, { childList: true, subtree: true });
  }

  const timeout = window.setTimeout(() => {
    if (!app.ready) app.fail('The modern shell did not finish initializing within 15 seconds.');
  }, 15000);
  app.cancelStartupTimeout = () => window.clearTimeout(timeout);
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app?.root) return;

  try {
    const tenantBase = window.location.pathname.slice(0, window.location.pathname.lastIndexOf('/') + 1);
    app.baseUrl = `${window.location.origin}${tenantBase}`;
    app.urlFor = (file) => new URL(file, app.baseUrl).href;

    const titles = {
      dashboard: 'Daily operations',
      search: 'Student search',
      edit: 'Student edit',
      fee: 'Fee receipt',
      reports: 'Student report master'
    };
    const isUserRole = app.userRole === 'user' || app.userRole === 'class';
    const logoUrl = '/tsvh_asset/logo.png';

    function getUserLevelBadge() {
      const bridge = window.AndroidBridge;
      const role = (bridge && bridge.getUserRole) ? bridge.getUserRole() : app.userRole || 'admin';
      if (role === 'admin') {
        return '<span class="erp-header-role-badge badge-admin">ADMIN</span>';
      }
      if (role === 'class') {
        let classes = [];
        try {
          if (bridge && bridge.getAllowedClasses) {
            classes = JSON.parse(bridge.getAllowedClasses() || '[]');
          }
        } catch (_) {}
        const label = classes.length > 0 ? `CLASS ${classes.join(', ')}` : 'CLASS VIEW';
        return `<span class="erp-header-role-badge badge-class">${label}</span>`;
      }
      return '<span class="erp-header-role-badge badge-user">USER</span>';
    }

    function getUserClassBoxLabel() {
      const bridge = window.AndroidBridge;
      const role = (bridge && bridge.getUserRole) ? bridge.getUserRole() : app.userRole || 'admin';
      if (role === 'class') {
        let classes = [];
        try {
          if (bridge && bridge.getAllowedClasses) {
            classes = JSON.parse(bridge.getAllowedClasses() || '[]');
          }
        } catch (_) {}
        if ((!classes || classes.length === 0) && bridge && bridge.getAllowedClassIds) {
          try {
            const ids = JSON.parse(bridge.getAllowedClassIds() || '[]');
            const idMap = {
              '2': 'PG', '3': 'Nur', '4': 'LKG', '5': 'UKG',
              '6': '1st', '7': '2nd', '8': '3rd', '9': '4th',
              '10': '5th', '11': '6th', '12': '7th', '13': '8th',
              '14': '9th', '15': '10th', '16': '11th', '17': '12th'
            };
            classes = ids.map(id => idMap[String(id)] || id);
          } catch (_) {}
        }
        if (classes && classes.length > 0) {
          return classes.map(c => {
            let s = String(c || '').replace(/^class[\s_-]*/i, '').trim();
            let lower = s.toLowerCase();
            if (lower === 'play group' || lower === 'play' || lower === 'playgroup') return 'PG';
            if (lower === 'nursery' || lower === 'nur') return 'Nur';
            if (lower === 'lkg') return 'LKG';
            if (lower === 'ukg') return 'UKG';
            return s;
          }).join('/');
        }
        return 'CLASS';
      }
      return 'ALL';
    }

    const routeLabels = {
      dashboard: 'Dashboard',
      report: 'Report',
      search: 'Search',
      edit: 'Student Edit',
      fee: 'Fee'
    };
    let currentRoute = app.page;
    if (app.page === 'dashboard') {
      if (window.location.hash === '#fee') {
        currentRoute = 'fee';
      } else if (window.location.hash === '#report') {
        currentRoute = 'report';
      }
    }
    const activeTabLabel = routeLabels[currentRoute] || 'Dashboard';

    const navRowHtml = isUserRole
      ? `<div class="erp-nav-row erp-user-nav-row">
          <div class="erp-nav-left">
            <div class="erp-class-square-box" title="Assigned Class">${getUserClassBoxLabel()}</div>
          </div>
          <div class="erp-nav-center">
            <nav class="erp-primary-nav" aria-label="Primary navigation">
              <a href="${app.urlFor(app.routes.dashboard)}" data-route="dashboard" class="erp-nav-item ${app.page === 'dashboard' && window.location.hash !== '#report' && window.location.hash !== '#fee' ? 'active' : ''}">
                <span class="erp-nav-label">Dashboard</span>
              </a>
              <a href="${app.urlFor(app.routes.dashboard)}#report" data-route="report" class="erp-nav-item ${window.location.hash === '#report' ? 'active' : ''}">
                <span class="erp-nav-label">Report</span>
              </a>
              <a href="${app.urlFor(app.routes.dashboard)}#fee" data-route="fee" class="erp-nav-item ${window.location.hash === '#fee' ? 'active' : ''}">
                <span class="erp-nav-label">Fee</span>
              </a>
            </nav>
          </div>
          <div class="erp-nav-right">
            <button class="erp-theme-toggle" type="button" aria-label="Switch theme" title="Switch theme"><span aria-hidden="true">◐</span></button>
          </div>
        </div>`
      : `<div class="erp-nav-row erp-admin-nav-row">
          <div class="erp-tab-dropdown-wrap">
            <button class="erp-tab-dropdown-btn" type="button" id="erp-tab-selector-btn" aria-haspopup="true" aria-expanded="false">
              <span class="erp-tab-selected-label">${activeTabLabel}</span>
              <span class="erp-tab-dropdown-arrow" aria-hidden="true">▾</span>
            </button>
            <div class="erp-tab-dropdown-menu" id="erp-tab-selector-menu" hidden>
              <a href="${app.urlFor(app.routes.dashboard)}" data-route="dashboard" class="erp-tab-item ${app.page === 'dashboard' && window.location.hash !== '#report' && window.location.hash !== '#fee' ? 'active' : ''}">Dashboard</a>
              <a href="${app.urlFor(app.routes.dashboard)}#report" data-route="report" class="erp-tab-item ${window.location.hash === '#report' ? 'active' : ''}">Report</a>
              <a href="${app.urlFor(app.routes.dashboard)}#fee" data-route="fee" class="erp-tab-item ${window.location.hash === '#fee' ? 'active' : ''}">Fee</a>
              <a href="${app.urlFor(app.routes.search)}" data-route="search" class="erp-tab-item ${app.page === 'search' ? 'active' : ''}">Search</a>
              <a href="${app.urlFor(app.routes.edit)}" data-route="edit" class="erp-tab-item ${app.page === 'edit' ? 'active' : ''}">Student Edit</a>
            </div>
          </div>
          <div class="erp-nav-right-actions">
            <div class="erp-more-wrap">
              <button class="erp-more-button" type="button" aria-expanded="false" aria-haspopup="true">
                <span>More</span> <span class="erp-more-caret" aria-hidden="true">▾</span>
              </button>
              <div class="erp-more-panel" hidden>
                <div class="erp-more-header">All ERP Modules</div>
                <input id="erp-more-filter" type="search" placeholder="Filter modules…" autocomplete="off">
                <div class="erp-more-links" role="list"></div>
              </div>
            </div>
            <button class="erp-theme-toggle" type="button" aria-label="Switch theme" title="Switch theme"><span aria-hidden="true">◐</span></button>
          </div>
        </div>`;

    app.root.innerHTML = `
      <div class="erp-app-frame">
        <header class="erp-topbar">
          <div class="erp-brand-row">
            <a class="erp-brand" href="${app.urlFor(app.routes.dashboard)}" aria-label="School ERP dashboard">
              <span class="erp-brand-mark"><img src="${logoUrl}" alt="School logo"></span>
              <div class="erp-brand-copy">
                <div class="erp-school-title"><span>THE SANSKAR VALLEY</span> <span>HIGHER SECONDARY SCHOOL</span></div>
                <div class="erp-school-sub-row">
                  <span class="erp-school-city">KANNOD (M.P.)</span>
                  ${!isUserRole ? `<span class="erp-sub-divider">•</span>${getUserLevelBadge()}` : ''}
                </div>
              </div>
            </a>
          </div>
          ${navRowHtml}
        </header>
        <div class="erp-searchbar-row">
          <div class="erp-search-wrap">
          <div class="erp-global-search">
            <span class="erp-search-icon" aria-hidden="true">⌕</span>
            <select id="erp-search-by" aria-label="Search students by"><option value="1">Name</option><option value="2">Mobile</option><option value="3">Father</option><option value="4">Scholar no.</option></select>
            <input id="erp-student-search" type="search" placeholder="Find a student" autocomplete="off" aria-autocomplete="list" aria-controls="erp-search-results" aria-expanded="false">
            <span class="erp-search-spinner" aria-hidden="true"></span>
          </div>
          <div id="erp-search-results" class="erp-search-results" role="listbox" hidden></div>
          </div>
          <span class="erp-search-hint">Choose a student to load their details and fee status together</span>
        </div>
        <main class="erp-main">
          ${!isUserRole ? `
          <div class="erp-page-heading">
            <div><p class="erp-eyebrow">SCHOOL OFFICE</p><h1>${titles[app.page]}</h1></div>
            <span class="erp-page-context">Connected to School ERP</span>
          </div>` : ''}
          <div class="erp-action-area"></div>
          ${(app.page !== 'dashboard' || !isUserRole) ? `
          <section class="erp-source-content" aria-label="Original ERP page">
            <div class="erp-content-skeleton"><span></span><span></span><span></span></div>
          </section>` : ''}
        </main>
        <section id="erp-report-view" class="erp-report-view" hidden style="display:none;"></section>
        <section id="erp-fee-view" class="erp-fee-view" hidden style="display:none;"></section>
      </div>`;

    const watermark = document.createElement('img');
    watermark.className = 'erp-school-watermark';
    watermark.src = logoUrl;
    watermark.alt = '';
    watermark.setAttribute('aria-hidden', 'true');
    app.root.prepend(watermark);
    let watermarkFrame = 0;
    let watermarkObserver = null;
    let scheduleWatermarkRefresh = null;
    if (app.page !== 'dashboard') {
      const textWatermark = document.createElement('div');
      textWatermark.className = 'erp-school-text-watermark';
      textWatermark.setAttribute('aria-hidden', 'true');
      app.root.prepend(textWatermark);
      const watermarkText = 'THE SANSKAR VALLEY HIGHER SECONDARY SCHOOL • ';
      let watermarkShape = '';
      const refreshWatermark = () => {
        const width = Math.ceil(Math.max(window.innerWidth, document.documentElement.clientWidth) * 1.4);
        const height = Math.ceil(window.innerHeight * 1.2);
        const rowCount = Math.ceil(height / 38) + 2;
        const repeatCount = Math.ceil(width / 330) + 1;
        const shape = `${rowCount}:${repeatCount}`;
        textWatermark.style.width = '100vw';
        textWatermark.style.height = '100vh';
        if (shape === watermarkShape) return;
        watermarkShape = shape;
        const rows = document.createDocumentFragment();
        for (let row = 0; row < rowCount; row += 1) {
          const line = document.createElement('span');
          line.textContent = watermarkText.repeat(repeatCount);
          rows.appendChild(line);
        }
        textWatermark.replaceChildren(rows);
      };
      scheduleWatermarkRefresh = () => {
        window.cancelAnimationFrame(watermarkFrame);
        watermarkFrame = window.requestAnimationFrame(refreshWatermark);
      };
      refreshWatermark();
      window.addEventListener('resize', scheduleWatermarkRefresh);
      watermarkObserver = new ResizeObserver(scheduleWatermarkRefresh);
      watermarkObserver.observe(app.root);
    }
    const calendarPopupSelector = '#ui-datepicker-div,.ui-datepicker,.datepicker,.datepicker-dropdown,.bootstrap-datetimepicker-widget,.tcal,#tcal,.datepick-popup,.datetimepicker,.flatpickr-calendar,.daterangepicker,#calendarDiv,#CalendarControl,#CalendarControlIFrame';
    const revealDatePicker = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const dateControl = target.matches('input#cdate,input[type="date"],input[class*="date" i],input[id*="date" i],input[name*="date" i],input[class*="tcal" i],input[id*="adm" i],input[name*="adm" i],input[onfocus*="calendar" i],input[onfocus*="showCalendarControl" i],input[onclick*="calendar" i],button[aria-label*="calendar" i],img[src*="calendar" i],img[src*="calender" i]') ||
        Boolean(target.closest('.tcalIcon,[class*="calendar" i],[class*="calender" i]'));
      if (!dateControl) return;
      window.setTimeout(() => {
        for (const popup of document.querySelectorAll(calendarPopupSelector)) {
          if (document.querySelector('#body-wrapper')?.contains(popup)) {
            document.body.appendChild(popup);
            popup.dataset.erpCalendarPortal = 'true';
          }
          if (popup.dataset.erpCalendarPortal === 'true' && popup.id !== 'CalendarControl' && popup.id !== 'CalendarControlIFrame') {
            const bounds = target.getBoundingClientRect();
            popup.style.position = 'fixed';
            popup.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - popup.offsetWidth - 8))}px`;
            popup.style.top = `${Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - popup.offsetHeight - 8))}px`;
          }
          popup.style.zIndex = '2147483647';
        }
      }, 0);
    };
    document.addEventListener('focusin', revealDatePicker, true);
    document.addEventListener('click', revealDatePicker, true);
    app.disposeShellUi = () => {
      if (scheduleWatermarkRefresh) {
        window.removeEventListener('resize', scheduleWatermarkRefresh);
        window.cancelAnimationFrame(watermarkFrame);
        watermarkObserver?.disconnect();
      }
      document.removeEventListener('focusin', revealDatePicker, true);
      document.removeEventListener('click', revealDatePicker, true);
    };

    app.searchInput = app.root.querySelector('#erp-student-search');
    app.searchBy = app.root.querySelector('#erp-search-by');
    app.searchResults = app.root.querySelector('#erp-search-results');
    app.searchSpinner = app.root.querySelector('.erp-search-spinner');
    app.actionArea = app.root.querySelector('.erp-action-area');
    app.sourceContent = app.root.querySelector('.erp-source-content');
    app.moreButton = app.root.querySelector('.erp-more-button');
    app.morePanel = app.root.querySelector('.erp-more-panel');
    app.moreLinks = app.root.querySelector('.erp-more-links');
    app.moreFilter = app.root.querySelector('#erp-more-filter');
    app.themeToggle = app.root.querySelector('.erp-theme-toggle');
    const themeKey = 'school-erp-dashboard-theme';
    const savedTheme = localStorage.getItem(themeKey);
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    app.root.setAttribute('data-theme', initialTheme);
    if (app.themeToggle) {
      app.themeToggle.setAttribute('aria-label', initialTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      app.themeToggle.title = initialTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      app.themeToggle.addEventListener('click', () => {
        const dark = app.root.getAttribute('data-theme') !== 'dark';
        const nextTheme = dark ? 'dark' : 'light';
        app.root.setAttribute('data-theme', nextTheme);
        localStorage.setItem(themeKey, nextTheme);
        app.themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        app.themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        app.root.dispatchEvent(new CustomEvent('erp-theme-change', { detail: { theme: nextTheme } }));
      });
    }

    const tabSelectorBtn = app.root.querySelector('#erp-tab-selector-btn');
    const tabSelectorMenu = app.root.querySelector('#erp-tab-selector-menu');
    const tabSelectedLabel = app.root.querySelector('.erp-tab-selected-label');

    if (tabSelectorBtn && tabSelectorMenu) {
      tabSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (app.morePanel) {
          app.morePanel.hidden = true;
          app.moreButton?.setAttribute('aria-expanded', 'false');
        }
        const open = !tabSelectorMenu.hidden;
        tabSelectorMenu.hidden = open;
        tabSelectorBtn.setAttribute('aria-expanded', String(!open));
      });

      tabSelectorMenu.querySelectorAll('.erp-tab-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const route = item.dataset.route;
          tabSelectorMenu.hidden = true;
          tabSelectorBtn.setAttribute('aria-expanded', 'false');

          if (route === 'dashboard' || route === 'report' || route === 'fee') {
            if (app.page === 'dashboard') {
              e.preventDefault();
              app.switchTab(route);
              try { history.replaceState(null, '', '#' + route); } catch (_) {}
            }
          }
        });
      });
    }

    if (app.moreButton && app.morePanel) {
      app.moreButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tabSelectorMenu) {
          tabSelectorMenu.hidden = true;
          tabSelectorBtn?.setAttribute('aria-expanded', 'false');
        }
        const open = !app.morePanel.hidden;
        app.morePanel.hidden = open;
        app.moreButton.setAttribute('aria-expanded', String(!open));
      });
    }

    app.moreFilter?.addEventListener('input', () => {
      const q = app.moreFilter.value.trim().toLowerCase();
      for (const link of app.moreLinks?.querySelectorAll('a') || []) {
        const text = (link.textContent || '').trim().toLowerCase();
        const match = q === '' || text.includes(q);
        link.hidden = !match;
        link.classList.toggle('is-hidden', !match);
        link.style.setProperty('display', match ? 'block' : 'none', 'important');
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      const link = target.closest ? target.closest('a[href]') : null;
      if (link && link.target === '_blank' && link.href && link.href.includes('schoolerpa.com')) {
        link.target = '_self';
      }
      if (app.morePanel && !app.morePanel.hidden && !app.morePanel.contains(target) && !app.moreButton?.contains(target)) {
        app.morePanel.hidden = true;
        app.moreButton?.setAttribute('aria-expanded', 'false');
      }
      if (tabSelectorMenu && !tabSelectorMenu.hidden && !tabSelectorMenu.contains(target) && !tabSelectorBtn?.contains(target)) {
        tabSelectorMenu.hidden = true;
        tabSelectorBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // Swipe to refresh reload: only enable when touch starts in top header
    document.addEventListener('touchstart', (e) => {
      const inHeader = Boolean(e.target.closest('.erp-topbar'));
      if (window.AndroidBridge && window.AndroidBridge.setSwipeRefreshEnabled) {
        window.AndroidBridge.setSwipeRefreshEnabled(inHeader && (window.scrollY || 0) <= 2);
      }
    }, { passive: true });

    app.switchTab = function(route) {
      const navItems = app.root.querySelectorAll('.erp-nav-item');
      navItems.forEach(item => {
        if (item.dataset.route === route) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      const tabItems = app.root.querySelectorAll('.erp-tab-item');
      tabItems.forEach(item => {
        if (item.dataset.route === route) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      if (tabSelectedLabel) {
        const labels = {
          dashboard: 'Dashboard',
          report: 'Report',
          search: 'Search',
          edit: 'Student Edit',
          fee: 'Fee'
        };
        if (labels[route]) tabSelectedLabel.textContent = labels[route];
      }

      const mainEl = app.root.querySelector('.erp-main');
      const searchRow = app.root.querySelector('.erp-searchbar-row');
      const reportView = app.root.querySelector('#erp-report-view');
      const feeView = app.root.querySelector('#erp-fee-view');

      if (route === 'fee') {
        if (mainEl) mainEl.hidden = true;
        if (searchRow) searchRow.hidden = true;
        if (reportView) {
          reportView.hidden = true;
          reportView.style.display = 'none';
        }
        if (feeView) {
          feeView.hidden = false;
          feeView.style.display = 'flex';
          if (typeof app.initFeeView === 'function') {
            app.initFeeView(feeView);
          } else {
            app.pendingFeeInit = true;
          }
        }
      } else if (route === 'report') {
        if (mainEl) mainEl.hidden = true;
        if (searchRow) searchRow.hidden = true;
        if (feeView) {
          feeView.hidden = true;
          feeView.style.display = 'none';
        }
        if (reportView) {
          reportView.hidden = false;
          reportView.style.display = 'flex';
          if (typeof app.initReportView === 'function') {
            app.initReportView(reportView);
          } else {
            app.pendingReportInit = true;
          }
        }
      } else {
        if (mainEl) mainEl.hidden = false;
        if (searchRow) searchRow.hidden = false;
        if (reportView) {
          reportView.hidden = true;
          reportView.style.display = 'none';
        }
        if (feeView) {
          feeView.hidden = true;
          feeView.style.display = 'none';
        }
      }
    };

    app.root.querySelectorAll('.erp-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const route = item.dataset.route;
        if (route === 'dashboard' || route === 'report' || route === 'fee') {
          if (app.page === 'dashboard') {
            e.preventDefault();
            app.switchTab(route);
            try { history.replaceState(null, '', '#' + route); } catch (_) {}
          }
        }
      });
    });

    window.addEventListener('hashchange', () => {
      if (app.page === 'dashboard') {
        if (window.location.hash === '#fee') {
          app.switchTab('fee');
        } else if (window.location.hash === '#report') {
          app.switchTab('report');
        } else {
          app.switchTab('dashboard');
        }
      }
    });

    if (app.page === 'dashboard') {
      if (window.location.hash === '#fee') {
        app.switchTab('fee');
      } else if (window.location.hash === '#report') {
        app.switchTab('report');
      }
    }

    app.pageTitle = titles[app.page];
    app.log('Application shell rendered', app.page);
  } catch (error) {
    app.fail(error);
  }
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app?.root) return;

  function waitForMainContent() {
    const current = document.querySelector('#main-content');
    if (current) return Promise.resolve(current);
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const main = document.querySelector('#main-content');
        if (main) {
          observer.disconnect();
          resolve(main);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(() => {
        observer.disconnect();
        const m = document.querySelector('#main-content');
        resolve(m || document.body);
      }, 3500);
    });
  }

  waitForMainContent().then((main) => {
  try {
    if (app.enabled === false) return;

    const isUserOrClass = app.userRole === 'user' || app.userRole === 'class';

    const menu = document.querySelector('#sidebar-menu');
    app.nativeNav = menu;

    // Only populate more-links and show more-button in admin mode
    if (!isUserOrClass) {
      const originalNavigation = document.querySelectorAll('#sidebar-menu a[href], .top_nav a[href]');
      if (originalNavigation.length && app.moreLinks) {
        const seen = new Set();
        for (const original of originalNavigation) {
          const href = original.href;
          let url;
          try { url = new URL(href, window.location.href); } catch (_) { continue; }
          if (url.origin !== window.location.origin || !url.pathname.includes('/school/')) continue;
          if (!/\.php$/i.test(url.pathname) || seen.has(url.href)) continue;
          seen.add(url.href);
          const link = document.createElement('a');
          link.href = url.href;
          link.textContent = original.textContent.trim().replace(/\s+/g, ' ');
          if (!link.textContent) continue;
          link.setAttribute('role', 'listitem');
          link.title = link.textContent;
          app.moreLinks.appendChild(link);
        }
      }

      const defaultModules = [
        { name: 'Student Search', href: app.urlFor(app.routes.search) },
        { name: 'Student Edit', href: app.urlFor(app.routes.edit) },
        { name: 'Fee Receipt', href: app.urlFor(app.routes.fee) },
        { name: 'Admission Form', href: app.urlFor('student_admission.php') },
        { name: 'Fee Collection Report', href: app.urlFor('fee_collection_report.php') },
        { name: 'Transfer Certificate (TC)', href: app.urlFor('tc.php') },
        { name: 'Attendance Register', href: app.urlFor('attendance.php') },
        { name: 'Inventory Dashboard', href: app.urlFor('inventory_welcome.php') }
      ];
      if (app.moreLinks && app.moreLinks.childElementCount === 0) {
        defaultModules.forEach(mod => {
          const link = document.createElement('a');
          link.href = mod.href;
          link.textContent = mod.name;
          link.setAttribute('role', 'listitem');
          link.title = mod.name;
          app.moreLinks.appendChild(link);
        });
      }
      if (app.moreButton) app.moreButton.hidden = false;
    }

    app.originalMain = { node: main, parent: main.parentNode, nextSibling: main.nextSibling };

    main.style.minHeight = '0px';
    main.style.height = 'auto';

    if (app.page === 'dashboard') {
      if (!isUserOrClass) {
        // Admin: show original ERP content in collapsible section
        if (app.sourceContent) {
          const intro = document.createElement('div');
          intro.className = 'erp-page-intro';
          intro.textContent = 'Student lookup, editing and fee collection are one step away. Existing ERP dashboard information remains below.';
          app.sourceContent.replaceChildren(intro);
          const details = document.createElement('details');
          details.className = 'erp-dashboard-source';
          const summary = document.createElement('summary');
          summary.textContent = 'Existing dashboard information';
          main.style.minHeight = '0px';
          main.style.height = 'auto';
          details.append(summary, main);
          app.sourceContent.appendChild(details);
          details.addEventListener('toggle', () => {
            main.style.minHeight = '0px';
            main.style.height = 'auto';
            if (details.open) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
          });
        }
      } else {
        // User/Class: remove the original ERP main content entirely
        main.remove();
      }
    } else {
      // On search/edit/fee pages: always attach source content
      if (app.sourceContent) {
        const intro = document.createElement('div');
        intro.className = 'erp-page-intro';
        const copy = {
          search: 'The class filters and advanced search form below are the original ERP controls.',
          edit: 'Student details and updates continue to use the original ERP record and validation.',
          fee: 'Student selection, fee loading, calculations and receipt submission stay with the original ERP.',
          reports: 'Report definitions and filters below are managed by the original ERP.'
        };
        intro.textContent = copy[app.page] || '';
        app.sourceContent.replaceChildren(intro);
        app.sourceContent.appendChild(main);
      }
    }

    if (app.page === 'edit') {
      if (typeof window.__initStudentEdit === 'function') {
        try { window.__initStudentEdit(); } catch (e) { app.log('initStudentEdit error', e); }
      }
    }

    document.documentElement.classList.add('erp-modern-active');
    app.markReady();
    app.cancelStartupTimeout?.();
    app.log('Original page content connected', app.page);
  } catch (error) {
    app.fail(error);
  }
  }).catch((error) => app.fail(error));
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app?.searchInput) return;

  const input = app.searchInput;
  const searchBy = app.searchBy;
  const results = app.searchResults;
  const searchWrap = app.root?.querySelector('.erp-search-wrap');
  const cache = new Map();
  let debounceTimer = 0;
  let requestVersion = 0;
  let activeIndex = -1;
  let currentItems = [];
  let activeController = null;
  let intendedAction = app.page === 'dashboard' ? 'dashboard' : 'edit';

  function updateSearchingState() {
    const wrap = searchWrap || app.root?.querySelector('.erp-search-wrap');
    if (wrap) wrap.classList.toggle('is-searching', (input.value || '').trim().length > 0);
  }

  function setStatus(message, loading = false) {
    results.replaceChildren();
    const row = document.createElement('div');
    row.className = 'erp-search-status';
    row.textContent = message;
    results.appendChild(row);
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    app.searchSpinner.classList.toggle('erp-spinning', loading);
  }

  function setOpen(open) {
    results.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) app.searchSpinner.classList.remove('erp-spinning');
  }

  function parseIdentity(text) {
    const scholar = text.match(/(?:scholar\s*(?:no\.?|number)?|sch\.?\s*no\.?|roll\s*(?:no\.?|number))\s*[:#-]?\s*([A-Za-z0-9/-]+)/i);
    const classMatch = text.match(/(?:class|grade)\s*[:.-]?\s*([A-Za-z0-9 -]+?)(?=\s*[·|,;]|\s+scholar|\s+roll|$)/i);
    const details = [];
    if (classMatch) details.push(`Class ${classMatch[1].trim()}`);
    if (scholar) details.push(`Scholar No. ${scholar[1]}`);
    return details.join(' · ');
  }

  function formatSuggestionLabel(label) {
    const piped = label.split('|').map((part) => part.trim()).filter(Boolean);
    if (piped.length > 1) {
      return { name: piped[0], detail: parseIdentity(label) || piped.slice(1).join(' · ') };
    }

    // This ERP response places the scholar number first in its legacy dash-delimited label.
    const fields = label.split('-').map((part) => part.trim());
    if (fields.length >= 4 && /^[A-Za-z0-9/]+$/.test(fields[0])) {
      const name = fields.slice(1, -2).join('-').trim();
      const father = fields.at(-2);
      const className = fields.at(-1);
      if (name && className) {
        return { name, detail: [`Class ${className}`, `Scholar No. ${fields[0]}`, father && `Father ${father}`].filter(Boolean).join(' · ') };
      }
    }
    return { name: label, detail: parseIdentity(label) || 'ERP student suggestion' };
  }

  function parseAutocompleteResponse(text) {
    const items = [];
    const seen = new Set();
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [labelValue, idValue, statusValue] = line.split('!');
      const id = (idValue || '').trim();
      const label = (labelValue || '').trim();
      const status = (statusValue || '').trim();
      if (!id || id === '0' || !label || seen.has(id)) continue;
      seen.add(id);
      const presentation = formatSuggestionLabel(label);
      items.push({
        id,
        name: presentation.name,
        detail: status && status !== 'Active' ? `${presentation.detail} · ${status}` : presentation.detail
      });
    }
    return items.slice(0, 12);
  }

  function parseSearchResponse(html, responseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const items = [];
    const seen = new Set();
    const tenantPath = new URL(app.baseUrl).pathname;
    const add = (id, row, fallbackName = '') => {
      if (!id || id === '0' || seen.has(id)) return;
      seen.add(id);
      const rowText = (row?.textContent || fallbackName).trim().replace(/\s+/g, ' ');
      const cellNodes = Array.from(row?.querySelectorAll(':scope > td') || []);
      const cells = cellNodes.map((cell) => cell.textContent.trim().replace(/\s+/g, ' '));
      const headers = Array.from(row?.closest('table')?.querySelectorAll('thead tr:last-child th, thead tr:last-child td') || []).map((cell) => cell.textContent.trim().replace(/\s+/g, ' '));
      const nameColumn = headers.findIndex((header) => /student\s+name|^name$/i.test(header));
      let name = fallbackName.trim().replace(/\s+/g, ' ');
      if (nameColumn >= 0 && cells[nameColumn]) name = cells[nameColumn];
      if (!name || /^(edit|view|select|fee receipt|edit\/update|search|add sibling|call|whatsapp)$/i.test(name)) {
        name = cells.find((cell) => cell && !/^\d+$/.test(cell) && !/^(edit|view|select|fee receipt|edit\/update|search|add sibling|call|whatsapp)$/i.test(cell)) || rowText;
      }
      if (name) items.push({ id, name, detail: parseIdentity(rowText) || 'ERP student record' });
    };

    for (const anchor of doc.querySelectorAll('a[href]')) {
      let url;
      try { url = new URL(anchor.getAttribute('href'), responseUrl); } catch { continue; }
      if (url.origin !== window.location.origin || !url.pathname.startsWith(tenantPath)) continue;
      const id = url.searchParams.get('stuid') || url.searchParams.get('get_stuid');
      const row = anchor.closest('tr') || anchor.closest('[data-stuid], .student-row, .result-row') || anchor.parentElement;
      add(id, row, anchor.textContent);
    }
    for (const field of doc.querySelectorAll('[name="stuid"][value], [name="get_stuid"][value], [data-stuid]')) {
      const id = field.getAttribute('data-stuid') || field.value || field.getAttribute('value');
      const row = field.closest('tr') || field.closest('[data-stuid], .student-row, .result-row') || field.parentElement;
      add(id, row);
    }
    return items.slice(0, 12);
  }

  function matchesAllowedClass(text, allowedClasses) {
    if (!allowedClasses || allowedClasses.length === 0) return true;
    const lower = (text || '').toLowerCase();
    const m = lower.match(/class\s*[:.-]?\s*([a-z0-9_-]+)/i);
    const target = m ? m[1].toLowerCase() : lower;

    for (const cls of allowedClasses) {
      const c = cls.toLowerCase();
      if (target === c || target.startsWith(c + '-') || target.startsWith(c + ' ') || target.startsWith(c + '(') || target.startsWith(c + '/') ||
          lower.includes(`class ${c}`) || lower.includes(`class: ${c}`) || lower.includes(`class-${c}`)) {
        return true;
      }
    }
    return false;
  }

  function renderItems(items, version) {
    if (version !== requestVersion) return;

    const bridge = window.AndroidBridge;
    const allowedClasses = (bridge && bridge.getAllowedClasses)
      ? JSON.parse(bridge.getAllowedClasses() || '[]')
      : [];

    let displayItems = items;
    if (allowedClasses.length > 0) {
      displayItems = items.filter(student => {
        return matchesAllowedClass(student.detail || student.name, allowedClasses);
      });
    }

    currentItems = displayItems;
    activeIndex = -1;
    results.replaceChildren();
    if (!displayItems.length) {
      if (items.length > 0 && allowedClasses.length > 0) {
        setStatus(`No students found in your assigned class (${allowedClasses.join(', ')}).`);
      } else {
        setStatus('No student suggestions returned by the ERP. Try the dedicated Student Search page.');
      }
      return;
    }

    displayItems.forEach((student, index) => {
      const row = document.createElement('div');
      row.className = 'erp-result-row';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.id = `erp-student-result-${index}`;
      const select = document.createElement('button');
      select.type = 'button';
      select.className = 'erp-result-main';
      select.innerHTML = '<span class="erp-avatar" aria-hidden="true">●</span><span class="erp-result-copy"><strong></strong><small></small></span><span class="erp-result-enter" aria-hidden="true">↵</span>';
      select.querySelector('strong').textContent = student.name;
      select.querySelector('small').textContent = student.detail;
      select.addEventListener('click', () => openStudent(student, intendedAction));
      const actions = document.createElement('div');
      actions.className = 'erp-result-actions';
      const isRestricted = app.userRole === 'user' || app.userRole === 'class';
      const allowedActions = isRestricted ? [['edit', 'Edit']] : [['edit', 'Edit'], ['fee', 'Fee receipt']];
      for (const [action, label] of allowedActions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = action === 'fee' ? 'erp-action-link erp-action-link-muted' : 'erp-action-link';
        button.textContent = label;
        button.addEventListener('click', () => openStudent(student, action));
        actions.appendChild(button);
      }
      row.append(select, actions);
      results.appendChild(row);
    });
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    app.searchSpinner.classList.remove('erp-spinning');
  }

  function openStudent(student, action) {
    const id = student.id;
    if (!id) {
      setStatus('The ERP suggestion did not expose a student identifier. Open the original Student Search page to continue.');
      return;
    }
    const bridge = window.AndroidBridge;
    const allowedClasses = (bridge && bridge.getAllowedClasses)
      ? JSON.parse(bridge.getAllowedClasses() || '[]')
      : [];
    if (allowedClasses.length > 0) {
      if (!matchesAllowedClass(student.detail || student.name, allowedClasses)) {
        setStatus(`Access restricted: Student does not belong to your assigned class (${allowedClasses.join(', ')}).`);
        return;
      }
    }
    if ((app.userRole === 'user' || app.userRole === 'class') && action === 'fee') {
      return;
    }
    if (action === 'dashboard' && app.page === 'dashboard' && app.dashboardLoadStudent) {
      app.dashboardLoadStudent(student);
      input.value = student.name;
      setOpen(false);
      app.log('Loaded selected student in both dashboard workspaces', { id });
      return;
    }
    const target = action === 'fee' ? app.routes.fee : 'studentedit.php';
    const url = new URL(target, app.baseUrl);
    url.searchParams.set('stuid', id);
    const activeSession = document.querySelector('#sessid')?.value || new URLSearchParams(window.location.search).get('sessid') ||
      (() => {
        const link = document.querySelector('a[href*="sesupdate_new.php?id="]');
        try { return link ? new URL(link.href).searchParams.get('id') : ''; } catch { return ''; }
      })() || '6';
    url.searchParams.set('sessid', activeSession);
    window.location.href = url.href;
    setOpen(false);
    app.log('Opened student workflow', { action, id });
  }

  async function queryExistingAutocomplete(query, version, signal) {
    const url = `${app.urlFor('searchSuggestn1.php')}?search=${escape(query)}&q=${escape(searchBy.value)}`;
    const response = await fetch(url, { credentials: 'same-origin', signal });
    if (!response.ok) throw new Error(`ERP autocomplete returned HTTP ${response.status}.`);
    const text = await response.text();
    if (version !== requestVersion) return null;
    return parseAutocompleteResponse(text);
  }

  async function queryLegacyForm(query, version, signal) {
    const form = document.querySelector('form[name="frm"][action*="student_search_det.php"]');
    if (!form) return [];
    const search = form.querySelector('[name="stu_search"]');
    if (!search) return [];
    const data = new FormData(form);
    data.set(search.name, query);
    const menuSearch = form.querySelector('[name="tree_search"]');
    if (menuSearch) data.set(menuSearch.name, '');
    const response = await fetch(form.action, {
      method: (form.method || 'post').toUpperCase(),
      body: data,
      credentials: 'same-origin',
      redirect: 'follow',
      signal
    });
    if (!response.ok) throw new Error(`ERP student search returned HTTP ${response.status}.`);
    const html = await response.text();
    if (version !== requestVersion) return null;
    return parseSearchResponse(html, response.url || form.action);
  }

  async function search(query, version) {
    const key = `${searchBy.value}:${query.toLocaleLowerCase()}`;
    if (cache.has(key)) {
      renderItems(cache.get(key), version);
      return;
    }
    setStatus('Searching the ERP…', true);
    activeController = new AbortController();
    try {
      let items;
      try {
        items = await queryExistingAutocomplete(query, version, activeController.signal);
      } catch (primaryError) {
        if (version !== requestVersion) return;
        app.log('Original autocomplete request unavailable; trying the existing navigation search form.', primaryError);
        items = await queryLegacyForm(query, version, activeController.signal);
      }
      if (version !== requestVersion) return;
      items = (items || []).slice(0, 12);
      if (cache.size >= 30) cache.delete(cache.keys().next().value);
      if (items.every((item) => item.id)) {
        cache.set(key, items.map(({ id, name, detail }) => ({ id, name, detail })));
      }
      renderItems(items, version);
    } catch (error) {
      if (version !== requestVersion) return;
      app.log('Student search failed', error);
      setStatus('ERP search is unavailable right now. Use the dedicated Student Search page.');
    } finally {
      if (version === requestVersion) activeController = null;
    }
  }

  input.addEventListener('input', () => {
    updateSearchingState();
    window.clearTimeout(debounceTimer);
    activeController?.abort();
    activeController = null;
    const query = input.value.trim();
    const version = ++requestVersion;
    if (query.length < 2) {
      setOpen(false);
      app.searchSpinner.classList.remove('erp-spinning');
      return;
    }
    setStatus('Waiting for the ERP…', true);
    debounceTimer = window.setTimeout(() => search(query, version), 240);
  });
  input.addEventListener('blur', () => {
    if (!(input.value || '').trim()) {
      const wrap = searchWrap || app.root?.querySelector('.erp-search-wrap');
      if (wrap) wrap.classList.remove('is-searching');
    }
  });
  searchBy.addEventListener('change', () => {
    if (input.value.trim().length >= 2) input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  input.addEventListener('keydown', (event) => {
    const rows = Array.from(results.querySelectorAll('.erp-result-row'));
    if (event.key === 'Escape') {
      setOpen(false);
      input.blur();
    } else if (event.key === 'ArrowDown' && rows.length) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % rows.length;
      updateActive(rows);
    } else if (event.key === 'ArrowUp' && rows.length) {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? rows.length - 1 : activeIndex - 1;
      updateActive(rows);
    } else if (event.key === 'Enter') {
      if (rows.length && activeIndex >= 0) {
        event.preventDefault();
        rows[activeIndex].querySelector('.erp-result-main').click();
      } else if (rows.length) {
        event.preventDefault();
        rows[0].querySelector('.erp-result-main').click();
      }
    }
  });

  function updateActive(rows) {
    rows.forEach((row, index) => {
      row.setAttribute('aria-selected', String(index === activeIndex));
    });
    input.setAttribute('aria-activedescendant', `erp-student-result-${activeIndex}`);
  }

  document.addEventListener('keydown', (event) => {
    if (sessionStorage.getItem('school-erp-extension-enabled') === 'false') return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!app.root.contains(event.target)) setOpen(false);
  });

  app.search = {
    focus(action = app.page === 'dashboard' ? 'dashboard' : 'edit') {
      intendedAction = action;
      input.focus();
      input.placeholder = action === 'fee' ? 'Find a student for a fee receipt…' : action === 'dashboard' ? 'Search by name, mobile, father or scholar number…' : 'Find a student to edit…';
    },
    openStudent,
    get currentItems() { return currentItems; }
  };
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app || app.page !== 'edit') return;

  const pathname = window.location.pathname;
  const isSeditPage = pathname.includes('student_sedit.php');
  const isDirectEditPage = pathname.includes('studentedit.php');

  // Handle student_sedit.php with stuid: redirect directly to studentedit.php
  if (isSeditPage) {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('stuid') || params.get('id');
    if (sid) {
      const editUrl = new URL('studentedit.php', app.baseUrl);
      editUrl.searchParams.set('stuid', sid);
      editUrl.searchParams.set('sessid', params.get('sessid') || '6');
      window.location.replace(editUrl.href);
      return;
    }
  }

  // Handle studentedit.php without stuid and without student fields: redirect to student_sedit.php
  if (isDirectEditPage) {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('stuid') || params.get('id');
    const hasFields = Boolean(document.querySelector('#rollno, [name="rollno"], #name, [name="name"], #clsid, [name="clsid"]'));
    if (!sid && !hasFields) {
      window.location.replace('student_sedit.php');
      return;
    }
  }

  // 1. Implementation for student_sedit.php (Search to Edit)
  function renderStudentSearchEdit() {
    const form = document.querySelector('form#form') || document.querySelector('form[name="a"]') || document.querySelector('form');
    if (!form) return;
    if (form.dataset.erpSeditRendered === 'true') return;

    const srchBy = form.querySelector('#srchby, [name="srchby"]');
    const itemName = form.querySelector('#itemname, [name="itemname"]');
    const itemId = form.querySelector('#itemid, [name="itemid"]');
    const layer1 = form.querySelector('#layer1');
    const getStuDet = form.querySelector('#getstudet');

    if (!itemName && !srchBy) return;
    form.dataset.erpSeditRendered = 'true';
    form.classList.add('erp-sedit-form');

    const mainContent = document.querySelector('#main-content');
    if (mainContent) {
      mainContent.style.setProperty('min-height', '0px', 'important');
      mainContent.style.setProperty('height', 'auto', 'important');
    }

    const bridge = window.AndroidBridge;
    const role = (bridge && bridge.getUserRole) ? bridge.getUserRole() : app.userRole || 'admin';
    const roleBadgeText = role === 'admin' ? 'ADMIN ACCESS' : role === 'class' ? 'CLASS LEVEL' : 'USER LEVEL';

    const container = document.createElement('div');
    container.className = 'erp-sedit-container';

    container.innerHTML = `
      <div class="erp-edit-page-banner">
        <div class="erp-edit-banner-text">
          <h2>Student Edit</h2>
          <p>Search a student to view details, update records, and open full edit profile.</p>
        </div>
        <span class="erp-edit-role-badge">${roleBadgeText}</span>
      </div>
      <div class="erp-edit-card erp-sedit-card">
        <div class="erp-edit-card-header">
          <h3>⌕ Search Student to Edit</h3>
        </div>
        <div class="erp-edit-card-body erp-sedit-card-body">
          <div class="erp-sedit-row">
            <div class="erp-sedit-field erp-sedit-by">
              <label class="erp-field-label" for="srchby">Search By</label>
              <div class="erp-sedit-slot-srchby"></div>
            </div>
            <div class="erp-sedit-field erp-sedit-for">
              <label class="erp-field-label" for="itemname">Search Criteria</label>
              <div class="erp-sedit-slot-itemname"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="erp-sedit-results-slot"></div>
    `;

    if (srchBy) {
      container.querySelector('.erp-sedit-slot-srchby').appendChild(srchBy);
    }
    const forSlot = container.querySelector('.erp-sedit-slot-itemname');
    if (itemName) {
      itemName.placeholder = 'Type student name, scholar no, mobile or father name…';
      itemName.style.width = '100%';
      forSlot.appendChild(itemName);
    }
    if (itemId) {
      itemId.style.display = 'none';
      forSlot.appendChild(itemId);
    }
    if (layer1) {
      forSlot.appendChild(layer1);
    }
    if (getStuDet) {
      container.querySelector('.erp-sedit-results-slot').appendChild(getStuDet);
    }

    const origTable = form.querySelector('table');
    if (origTable) origTable.style.setProperty('display', 'none', 'important');

    form.prepend(container);

    if (getStuDet) {
      const enhanceResults = () => {
        const editLink = getStuDet.querySelector('a[href*="studentedit.php"]');
        if (editLink && !getStuDet.querySelector('.erp-sedit-primary-banner')) {
          const editHref = editLink.href;
          const banner = document.createElement('div');
          banner.className = 'erp-sedit-primary-banner';
          banner.innerHTML = `
            <div class="erp-sedit-banner-info">
              <h4>Student Record Found</h4>
              <p>Ready to edit complete student record and profile.</p>
            </div>
            <a href="${editHref}" class="erp-sedit-open-btn">
              ✏️ Open Full Student Edit
            </a>
          `;
          getStuDet.prepend(banner);
        }

        for (const a of getStuDet.querySelectorAll('a[href]')) {
          a.target = '_self';
        }
      };

      const obs = new MutationObserver(() => enhanceResults());
      obs.observe(getStuDet, { childList: true, subtree: true });
      enhanceResults();
    }

    if (itemName) {
      setTimeout(() => itemName.focus(), 250);
    }
  }

  // 2. Implementation for studentedit.php (Full Modern Edit Form)
  function renderModernEditCards() {
    const actionArea = app.actionArea || app.root?.querySelector('.erp-action-area');
    if (!actionArea) return;

    const form = document.querySelector('form#form') ||
                 document.querySelector('form[action*="studentedit1.php"]') ||
                 document.querySelector('form[name="a"]') ||
                 document.querySelector('form');

    if (!form) return;

    // Do NOT run while document is still streaming over network
    if (document.readyState === 'loading') return;

    const rollNoEl = form.querySelector('#rollno, [name="rollno"]');
    const nameEl = form.querySelector('#name, [name="name"]');
    const fnameEl = form.querySelector('#fname, [name="fname"]');
    if (!rollNoEl || !nameEl || !fnameEl) return;

    if (form.dataset.erpFieldsRendered === 'true') {
      const floatBar = document.getElementById('erp-floating-submit-bar');
      if (floatBar) floatBar.style.display = 'flex';
      return;
    }

    const mainContent = document.querySelector('#main-content');
    if (mainContent) {
      mainContent.style.setProperty('min-height', '0px', 'important');
      mainContent.style.setProperty('height', 'auto', 'important');
    }

    if (form.parentNode !== actionArea) {
      actionArea.appendChild(form);
    }

    form.classList.add('erp-form-modernized');
    form.dataset.erpFieldsRendered = 'true';

    let modernContainer = form.querySelector('.erp-modern-edit-container');
    if (!modernContainer) {
      modernContainer = document.createElement('div');
      modernContainer.className = 'erp-modern-edit-container';
      form.appendChild(modernContainer);
    }

    let legacyWrap = form.querySelector('.erp-legacy-fields-hidden');
    if (!legacyWrap) {
      legacyWrap = document.createElement('div');
      legacyWrap.className = 'erp-legacy-fields-hidden';
      legacyWrap.style.cssText = 'display:none !important;';

      while (form.firstChild) {
        if (form.firstChild === modernContainer) {
          form.removeChild(form.firstChild);
        } else {
          legacyWrap.appendChild(form.firstChild);
        }
      }
      form.appendChild(legacyWrap);
      form.appendChild(modernContainer);
    }

    modernContainer.innerHTML = '';

    const sections = [
      {
        title: 'Student Details',
        fields: [
          { key: 'img', label: 'Photo Upload', isPhoto: true },
          { key: 'rollno', label: 'Scholar No.' },
          { key: 'crollno', label: 'Roll No.' },
          { key: 'name', label: 'Student Name', required: true },
          { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)' },
          { key: 'gender', label: 'Gender', required: true },
          { key: 'cdate', altKey: 'date_ofjoin', label: 'Date of Admission' },
          { key: 'clsid', label: 'Current Class', required: true },
          { key: 'secid', label: 'Section', required: true },
          { key: 'egroup', label: 'Stream' },
          { key: 'smedium', label: 'Medium' },
          { key: 'hsrollno', label: 'PEN No.' },
          { key: 'enrollno', label: 'Enrollment No.' },
          { key: 'childid', label: 'Child ID' },
          { key: 'familyid', label: 'Family ID' },
          { key: 'adharcard', label: 'Aadhar Card' },
          { key: 'religion', label: 'Religion' },
          { key: 'stucast', label: 'Caste' },
          { key: 'cast', label: 'Category', required: true }
        ]
      },
      {
        title: 'Family Details',
        fields: [
          { key: 'fname', label: "Father's Name", required: true },
          { key: 'mname', label: "Mother's Name", required: true },
          { key: 'custom_text3', label: "Father Aadhar Card" },
          { key: 'fmobno', label: "Father's Mobile No.", required: true },
          { key: 'telphno', label: "SMS / WhatsApp No." }
        ]
      },
      {
        title: 'Address Details',
        fields: [
          { key: 'paddr', label: 'Address' },
          { key: 'croad', altKey: 'mcgram', label: 'Gram / City' },
          { key: 'ctygram', label: 'District' },
          { key: 'cpincode', label: 'Pincode' },
          { key: 'cstate', label: 'State' }
        ]
      },
      {
        title: 'Bank Details & Schemes',
        fields: [
          { key: 'schbname', label: 'Bank Name' },
          { key: 'accountno', label: 'Account No.' },
          { key: 'ifsc', label: 'IFSC Code' },
          { key: 'ahldname', label: 'Account Holder Name' },
          { key: 'feeapply', label: 'Schemes' }
        ]
      },
      {
        title: 'Facilities & Transport',
        fields: [
          { key: 'faclty', label: 'Facilities' },
          { key: 'routeid', label: 'Route / Hostel' },
          { key: 'vehicle_id', label: 'Vehicle' }
        ]
      }
    ];

    const bridge = window.AndroidBridge;
    const role = (bridge && bridge.getUserRole) ? bridge.getUserRole() : app.userRole || 'admin';
    const roleBadgeText = role === 'admin' ? 'ADMIN ACCESS' : role === 'class' ? 'CLASS LEVEL' : 'USER LEVEL';
    const banner = document.createElement('div');
    banner.className = 'erp-edit-page-banner';
    banner.innerHTML = `
      <div class="erp-edit-banner-text">
        <h2>Student Record Editor</h2>
        <p>Edit student details, family info, address and transport. Tap Save Changes when done.</p>
      </div>
      <span class="erp-edit-role-badge">${roleBadgeText}</span>
    `;
    modernContainer.appendChild(banner);

    const searchRoot = legacyWrap || form || document;

    sections.forEach(sec => {
      const card = document.createElement('div');
      card.className = 'erp-edit-card';

      const cardHead = document.createElement('div');
      cardHead.className = 'erp-edit-card-header';
      cardHead.innerHTML = `<h3>${sec.title}</h3>`;
      card.appendChild(cardHead);

      const cardBody = document.createElement('div');
      cardBody.className = 'erp-edit-card-body';

      sec.fields.forEach(f => {
        let el = searchRoot.querySelector('#' + f.key) ||
                 searchRoot.querySelector('[name="' + f.key + '"]');
        if (!el && f.altKey) {
          el = searchRoot.querySelector('#' + f.altKey) ||
               searchRoot.querySelector('[name="' + f.altKey + '"]');
        }
        if (!el) {
          el = form.querySelector('#' + f.key) ||
               form.querySelector('[name="' + f.key + '"]') ||
               (f.altKey ? form.querySelector('#' + f.altKey) || form.querySelector('[name="' + f.altKey + '"]') : null) ||
               document.querySelector('#' + f.key) ||
               document.querySelector('[name="' + f.key + '"]');
        }

        if (!el) return;

        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'erp-edit-field-group';

        if (f.isPhoto) {
          fieldGroup.classList.add('erp-photo-field-group');
          const existingImg = searchRoot.querySelector('img[src*="student"], img[src*="uploads"], img[src*="photo"]') ||
                              searchRoot.querySelector('input#img ~ img');
          const imgSrc = existingImg ? existingImg.src : '/tsvh_asset/logo.png';

          fieldGroup.innerHTML = `
            <div class="erp-photo-upload-box">
              <div class="erp-photo-avatar-wrapper">
                <img id="erp-student-photo-preview" src="${imgSrc}" alt="Student photo" />
              </div>
              <div class="erp-photo-action-wrap">
                <span class="erp-field-label">Student Photo</span>
                <p class="erp-photo-hint">Take picture with camera or pick from gallery.</p>
                <button type="button" class="erp-photo-upload-btn" id="erp-btn-pick-photo">
                  Capture / Choose Photo
                </button>
              </div>
            </div>
          `;

          el.style.position = 'absolute';
          el.style.width = '0';
          el.style.height = '0';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.accept = 'image/*';
          fieldGroup.appendChild(el);

          const pickBtn = fieldGroup.querySelector('#erp-btn-pick-photo');
          const preview = fieldGroup.querySelector('#erp-student-photo-preview');
          pickBtn.addEventListener('click', (e) => {
            e.preventDefault();
            el.click();
          });

          el.addEventListener('change', () => {
            if (el.files && el.files[0]) {
              const r = new FileReader();
              r.onload = (ev) => { preview.src = ev.target.result; };
              r.readAsDataURL(el.files[0]);
            }
          });
        } else {
          const label = document.createElement('label');
          label.className = 'erp-field-label';
          label.innerHTML = `${f.label} ${f.required ? '<span class="erp-req-star">*</span>' : ''}`;
          if (el.id) label.htmlFor = el.id;

          fieldGroup.appendChild(label);

          const parentWrap = el.closest('#clsname, #sectionid, #gethroutedet');
          if (parentWrap && !parentWrap.dataset.erpMoved) {
            parentWrap.dataset.erpMoved = 'true';
            fieldGroup.appendChild(parentWrap);
          } else if (!el.dataset.erpMoved) {
            el.dataset.erpMoved = 'true';
            fieldGroup.appendChild(el);
          }

          if (f.key === 'fmobno' || f.key === 'telphno') {
            if (el.value && el.value.trim().length >= 10) {
              const dialLink = document.createElement('a');
              dialLink.href = 'tel:' + el.value.trim();
              dialLink.className = 'erp-input-action-pill';
              dialLink.textContent = 'Call';
              label.appendChild(dialLink);
            }
          }
        }

        cardBody.appendChild(fieldGroup);
      });

      if (cardBody.childElementCount > 0) {
        card.appendChild(cardBody);
        modernContainer.appendChild(card);
      }
    });

    let floatBar = document.getElementById('erp-floating-submit-bar');
    if (!floatBar) {
      floatBar = document.createElement('div');
      floatBar.id = 'erp-floating-submit-bar';
      floatBar.className = 'erp-floating-submit-bar';
      floatBar.innerHTML = `
        <button type="button" class="erp-floating-submit-btn" id="erp-edit-save-btn">
          Save Changes
        </button>
      `;
      document.body.appendChild(floatBar);

      floatBar.querySelector('#erp-edit-save-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.validateForm === 'function' && document.a && document.a.paidamt) {
          try {
            const ok = window.validateForm();
            if (ok === false) return;
          } catch (_) {}
        }
        const nativeSubmit = (legacyWrap || form || document).querySelector('input[type="submit"], button[type="submit"]');
        if (nativeSubmit) {
          nativeSubmit.click();
        } else if (form && form.requestSubmit) {
          form.requestSubmit();
        } else if (form) {
          form.submit();
        }
      });
    }
    floatBar.style.display = 'flex';

    app.log('Student edit form successfully redesigned into modern cards.');
  }

  // Master dispatcher
  function initEditPage() {
    if (isSeditPage) {
      renderStudentSearchEdit();
    } else {
      renderModernEditCards();
    }
  }

  window.__initStudentEdit = initEditPage;
  if (document.readyState !== 'loading') {
    initEditPage();
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', initEditPage, { once: true });
    document.addEventListener('DOMContentLoaded', initEditPage, { once: true });
  }

  const editObserver = new MutationObserver(() => {
    if (document.readyState === 'loading') return;
    if (isSeditPage) {
      if (document.querySelector('form#form #itemname, form[name="a"] #itemname')) {
        renderStudentSearchEdit();
      }
    } else {
      if (document.querySelector('#rollno, [name="rollno"]') &&
          document.querySelector('#name, [name="name"]') &&
          document.querySelector('#fname, [name="fname"]')) {
        renderModernEditCards();
      }
    }
  });
  editObserver.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => editObserver.disconnect(), 15000);
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app || app.page !== 'fee') return;
  app.log('Fee receipt page adapter ready; original fee calculations and submission remain connected.');
})();
(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app || app.page !== 'dashboard' || !app.actionArea) return;

  const grid = document.createElement('section');
  grid.className = 'erp-student-workspaces';
  grid.setAttribute('aria-label', 'Selected student workspaces');

  const isAdmin = app.userRole === 'admin';
  const studentFooter = isAdmin
    ? `<footer class="erp-workspace-footer erp-admin-actions-grid">
         <a class="erp-action-btn erp-btn-edit" data-open="edit" href="#" aria-disabled="true">Edit Student</a>
         <button class="erp-action-btn" type="button" data-action="admission-print" disabled>Admission Form</button>
         <button class="erp-action-btn" type="button" data-action="enrollment-print" disabled>Enrollment Cert</button>
         <button class="erp-action-btn" type="button" data-action="tc-print" disabled>Transfer Cert</button>
       </footer>`
    : '<footer class="erp-workspace-footer"><a class="erp-action-btn erp-btn-edit" data-open="edit" href="#" aria-disabled="true">Edit student record</a></footer>';

  const feeContent = isAdmin
    ? '<section class="erp-fee-summary" aria-label="Student fee status"><div class="erp-fee-summary-head"><strong>Fee account</strong><small></small></div><dl></dl></section><form class="erp-fee-quick-form" aria-label="Fee transaction"><label>Total Fee<input type="text" inputmode="decimal" data-fee-control="totalfee" disabled></label><label>Discount<input type="text" inputmode="decimal" data-fee-control="discount" disabled></label><button type="submit" disabled>Submit</button></form><div class="erp-fee-loading" hidden role="status" aria-live="polite"><span class="erp-fee-spinner" aria-hidden="true"></span><strong>Submitting fee…</strong><small>Waiting for the ERP to confirm and prepare the receipt.</small></div><p class="erp-fee-message" hidden role="status"></p>'
    : '<section class="erp-fee-summary" aria-label="Student fee status"><div class="erp-fee-summary-head"><strong>Fee account</strong><small></small></div><dl></dl></section>';

  const feeFooter = isAdmin
    ? '<footer class="erp-workspace-footer"><a class="erp-workspace-open" data-open="fee" href="#" aria-disabled="true">Open full fee receipt</a></footer>'
    : '';

  grid.innerHTML = `
    <article class="erp-workspace-card erp-student-card">
      <div class="erp-workspace-body erp-student-workspace-body"><div class="erp-workspace-empty"><strong>Search for a student above</strong><small>Select a student from the search results to view their details and fee status.</small></div></div>
      ${studentFooter}
    </article>
    <article class="erp-workspace-card erp-fee-card">
      <header class="erp-workspace-heading"><span class="erp-workspace-icon erp-fee-icon">₹</span><div><h2>Fee Receipt</h2><p>Fee status only</p></div><span class="erp-workspace-status" data-state="empty">Waiting for student</span></header>
      <div class="erp-workspace-body erp-fee-workspace-body"><div class="erp-fee-panel">
        ${feeContent}
      </div></div>
      ${feeFooter}
    </article>`;
  app.actionArea.replaceChildren(grid);

  const studentBody = grid.querySelector('.erp-student-workspace-body');
  const feeBody = grid.querySelector('.erp-fee-workspace-body');
  const cards = [...grid.querySelectorAll('.erp-workspace-card')];
  const openLinks = [...grid.querySelectorAll('[data-open]')];
  const admissionPrintButton = grid.querySelector('[data-action="admission-print"]');
  const enrollmentPrintButton = grid.querySelector('[data-action="enrollment-print"]');
  const tcPrintButton = grid.querySelector('[data-action="tc-print"]');
  let selectedAdmissionRecord = null;
  let selectedAdmissionStudentId = '';

  function openStudentPrint(button, label, type) {
    if (!selectedAdmissionRecord || !selectedAdmissionStudentId || button.disabled) return;
    button.disabled = true;
    button.firstChild.textContent = 'Preparing… ';
    const payload = { record: selectedAdmissionRecord, studentId: selectedAdmissionStudentId };
    if (window.AndroidBridge && window.AndroidBridge.openPrintPage) {
      window.AndroidBridge.openPrintPage(type, JSON.stringify(payload));
    } else {
      app.log('AndroidBridge not found for ' + type);
    }
    setTimeout(() => {
      button.firstChild.textContent = `${label} `;
      button.disabled = !selectedAdmissionRecord?.Name;
    }, 400);
  }

  admissionPrintButton?.addEventListener('click', () => {
    if (!selectedAdmissionRecord || !selectedAdmissionStudentId || admissionPrintButton.disabled) return;
    const initialLabel = 'Admission Form';
    admissionPrintButton.disabled = true;
    admissionPrintButton.firstChild.textContent = 'Preparing… ';
    const payload = { record: selectedAdmissionRecord, studentId: selectedAdmissionStudentId };
    if (window.AndroidBridge && window.AndroidBridge.openPrintPage) {
      window.AndroidBridge.openPrintPage('openSchoolErpAdmissionPrint', JSON.stringify(payload));
    } else {
      app.log('AndroidBridge not found for openSchoolErpAdmissionPrint');
    }
    setTimeout(() => {
      admissionPrintButton.firstChild.textContent = `${initialLabel} `;
      admissionPrintButton.disabled = false;
    }, 400);
  });
  enrollmentPrintButton?.addEventListener('click', () =>
    openStudentPrint(enrollmentPrintButton, 'Enrollment Cert', 'openSchoolErpEnrollmentPrint'));
  tcPrintButton?.addEventListener('click', () =>
    openStudentPrint(tcPrintButton, 'Transfer Cert', 'openSchoolErpTransferPrint'));
  function setCardStatus(card, label, state) {
    const status = card.querySelector('.erp-workspace-status');
    if (status) {
      status.textContent = label;
      status.dataset.state = state;
    }
  }

  function currentSessionId() {
    const direct = document.querySelector('#sessid')?.value || new URLSearchParams(window.location.search).get('sessid');
    if (direct) return direct;
    for (const anchor of document.querySelectorAll('a[href*="sesupdate_new.php?id="]')) {
      try { const id = new URL(anchor.href).searchParams.get('id'); if (id) return id; } catch { /* Ignore malformed ERP links. */ }
    }
    return '6';
  }

  function currentSessionName() {
    const select = document.querySelector('#sessid');
    const selected = numericText(select?.selectedOptions?.[0]?.textContent || '');
    if (selected && !/^\d+$/.test(selected)) return selected;
    for (const anchor of document.querySelectorAll('a[href*="sesupdate_new.php?id="]')) {
      const label = numericText(anchor.textContent);
      if (label) return label;
    }
    return selected || `Session ${currentSessionId()}`;
  }

  function numericText(value) {
    return (value || '').trim().replace(/\s+/g, ' ');
  }

  function normalizeKey(label) {
    return numericText(label).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '');
  }

  function extractAdmissionData(doc) {
    const lines = new Map();
    for (const line of doc.querySelectorAll('.line')) {
      const title = line.querySelector('.title');
      if (!title) continue;
      const valueNode = line.querySelector('.valuetext') || [...line.querySelectorAll('span')].find((span) => span !== title);
      const label = normalizeKey(title.textContent);
      const value = numericText(valueNode?.textContent);
      if (label && value && !/^[-–—]+$/.test(value) && !lines.has(label)) lines.set(label, value);
    }
    const pick = (...keys) => keys.map((key) => lines.get(key)).find(Boolean) || '';
    const className = pick('class');
    const section = pick('section');
    const facilityItems = [
      ['Facilities', pick('facilities')],
      ['Route', pick('routehostel')]
    ].filter(([, value]) => value && !/^no$/i.test(value));
    return {
      name: pick('name'),
      scholar: pick('scholarno'),
      className: [className, section].filter(Boolean).join(' · '),
      session: currentSessionName(),
      father: pick('fathername'),
      mother: pick('mothersname', 'mothername'),
      dob: pick('dateofbirth'),
      mobile: pick('fathersmobileno', 'smswhatsappno', 'mothersmobileno'),
      address: pick('address'),
      facility: facilityItems.map(([label, value]) => `${label}: ${value}`).join(' · ') || pick('facilities', 'routehostel')
    };
  }

  function extractAdmissionRecord(doc) {
    const record = {};
    for (const line of doc.querySelectorAll('.line')) {
      const title = line.querySelector('.title');
      if (!title) continue;
      const valueNode = line.querySelector('.valuetext') ||
        (line.lastElementChild !== title && line.lastElementChild?.tagName === 'SPAN' ? line.lastElementChild : null);
      record[numericText(title.textContent)] = numericText(valueNode?.textContent);
    }
    const sessionMatch = numericText(doc.body?.innerText || '').match(/\(\s*(\d{4})\s*[-–]\s*(\d{4})\s*\)/);
    if (sessionMatch) {
      record.start_session = sessionMatch[1];
      record.end_session = sessionMatch[2];
    } else {
      const yearRange = currentSessionName().match(/(\d{4})\s*[-–]\s*(\d{4})/);
      if (yearRange) {
        record.start_session = yearRange[1];
        record.end_session = yearRange[2];
      }
    }
    return record;
  }

  function renderStudent(fields, student, url) {
    const studentName = fields.name || student.name || '—';
    const scholarNo = fields.scholar || '—';
    const className = fields.className || '—';
    const session = fields.session || currentSessionName() || '—';
    const dob = fields.dob || '—';
    const mobile = fields.mobile || '—';
    const father = fields.father || '—';
    const mother = fields.mother || '—';
    const address = fields.address || '—';
    const facility = fields.facility || '—';

    const cleanPhone = String(mobile).replace(/[^\d+]/g, '');
    const phoneHtml = cleanPhone.length >= 5 
      ? `<a href="tel:${cleanPhone}" class="erp-phone-link" title="Tap to call">Call ${mobile}</a>`
      : `<span>${mobile}</span>`;

    const details = document.createElement('div');
    details.className = 'erp-student-details';
    details.innerHTML = `
      <div class="erp-student-summary">
        <strong class="erp-student-name">${studentName}</strong>
      </div>
      <div class="erp-student-grid-custom">
        <!-- Row 1: Scholar No, Class & Section, Session in one row -->
        <div class="erp-row-triple">
          <div class="erp-field-box erp-field-scholar">
            <span class="erp-label">Scholar No.</span>
            <span class="erp-val erp-val-scholar">${scholarNo}</span>
          </div>
          <div class="erp-field-box">
            <span class="erp-label">Class & Sec</span>
            <span class="erp-val">${className}</span>
          </div>
          <div class="erp-field-box">
            <span class="erp-label">Session</span>
            <span class="erp-val">${session}</span>
          </div>
        </div>

        <!-- Row 2: DOB and Mobile Number in one row -->
        <div class="erp-row-double">
          <div class="erp-field-box">
            <span class="erp-label">Date of birth</span>
            <span class="erp-val">${dob}</span>
          </div>
          <div class="erp-field-box erp-field-mobile">
            <span class="erp-label">Mobile number</span>
            <span class="erp-val">${phoneHtml}</span>
          </div>
        </div>

        <!-- Other Details -->
        <div class="erp-row-double">
          <div class="erp-field-box">
            <span class="erp-label">Father’s name</span>
            <span class="erp-val">${father}</span>
          </div>
          <div class="erp-field-box">
            <span class="erp-label">Mother’s name</span>
            <span class="erp-val">${mother}</span>
          </div>
        </div>

        <div class="erp-row-double">
          <div class="erp-field-box">
            <span class="erp-label">Address</span>
            <span class="erp-val">${address}</span>
          </div>
          <div class="erp-field-box">
            <span class="erp-label">Facility</span>
            <span class="erp-val">${facility}</span>
          </div>
        </div>
      </div>
    `;

    const frame = studentBody.querySelector('.erp-source-student');
    for (const child of [...studentBody.children]) if (child !== frame) child.remove();
    studentBody.insertBefore(details, frame || null);
    const knownValues = Object.values(fields).filter(Boolean).length;
    setCardStatus(cards[0], knownValues >= 5 ? 'Record loaded' : 'Some details unavailable', knownValues >= 5 ? 'ready' : 'error');
    const editLink = openLinks.find((link) => link.dataset.open === 'edit');
    if (editLink) {
      editLink.href = url;
      editLink.removeAttribute('aria-disabled');
    }
  }

  function readReceiptFields(doc) {
    const value = (selector) => numericText(doc.querySelector(selector)?.value || '');
    const textNumber = (text) => Number.parseFloat((text || '').replace(/[^\d.-]/g, '')) || 0;
    const clsid = doc.querySelector('input[type="hidden"][name="clsid"]');
    const className = clsid?.parentNode?.textContent.replace(clsid.value, '').trim().replace(/\s+/g, ' ') || '';
    const cyear = doc.getElementById('cyear');
    const academicYear = cyear?.parentNode?.textContent.trim().replace(/\s+/g, ' ') || '';
    const tel = doc.querySelector('a[href^="tel:"]')?.getAttribute('href').replace(/^tel:/, '').replace(/^\+91/, '').trim() || '';
    const transactions = [];
    let discount = 0;
    let paid = 0;
    const table = doc.querySelector('table.k1');
    for (const row of table?.querySelectorAll('tbody tr') || []) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 10) continue;
      const date = numericText(cells[3]?.textContent);
      const mode = numericText(cells[9]?.textContent);
      if (!date || /^(date|total)$/i.test(date) || /^pmode$/i.test(mode) || /total/i.test(cells[3]?.textContent || '')) continue;
      const amount = textNumber(cells[8]?.textContent);
      const rowDiscount = textNumber(cells[7]?.textContent);
      transactions.push({ date, mode, amount });
      paid += amount;
      discount += rowDiscount;
    }
    let total = 0;
    for (const strong of doc.querySelectorAll('strong')) {
      const match = strong.textContent.match(/Net Amount\s*:\s*([\d.]+)/i);
      if (match) { total = Number.parseFloat(match[1]) || 0; break; }
    }
    return {
      name: value('#name'), father: value('#fname'), scholar: value('#rollno'), className,
      academicYear, mobile: tel, total, discount, payable: total - discount,
      paid, due: total - discount - paid, transactions
    };
  }

  const feeSummary = feeBody.querySelector('.erp-fee-summary');
  const feeQuickForm = feeBody.querySelector('.erp-fee-quick-form');
  const feeLoading = feeBody.querySelector('.erp-fee-loading');
  const feeMessage = feeBody.querySelector('.erp-fee-message');
  const feeControls = {
    totalfee: feeQuickForm?.querySelector('[data-fee-control="totalfee"]'),
    discount: feeQuickForm?.querySelector('[data-fee-control="discount"]')
  };
  const feeMetricLabels = ['Total fee', 'Fee waiver', 'Payable', 'Submitted', 'Remaining'];
  const feeMetricValues = feeMetricLabels.map((label) => {
    const item = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = '—';
    item.append(dt, dd);
    feeSummary.querySelector('dl').appendChild(item);
    return dd;
  });
  let feeContext = null;
  let feeSummarySignature = '';

  function setFeeLoading(active, message = 'Submitting fee…') {
    if (!feeLoading) return;
    feeLoading.hidden = !active;
    const s = feeLoading.querySelector('strong');
    if (s) s.textContent = message;
    feeBody.dataset.loading = active ? 'true' : 'false';
    if (active && feeMessage) feeMessage.hidden = true;
  }

  function setFeeMessage(message, isError = false) {
    if (!feeMessage) return;
    feeMessage.textContent = message;
    feeMessage.hidden = !message;
    feeMessage.dataset.state = isError ? 'error' : 'ready';
  }

  function renderFeeSummary(doc) {
    const data = readReceiptFields(doc);
    if (!data.name && !data.scholar) return data;
    const amounts = [data.total, data.discount, data.payable, data.paid, data.due];
    const signature = JSON.stringify([data.name, data.scholar, ...amounts]);
    if (signature === feeSummarySignature) return data;
    feeSummarySignature = signature;
    feeSummary.querySelector('.erp-fee-summary-head strong').textContent = data.name || 'Fee account';
    feeSummary.querySelector('.erp-fee-summary-head small').textContent = data.scholar ? `Scholar ${data.scholar}` : 'Fee status';
    amounts.forEach((amount, index) => {
      feeMetricValues[index].textContent = `₹ ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    });
    return data;
  }

  function findFeeInput(doc, key) {
    const direct = key === 'totalfee'
      ? doc.querySelector('#totalfee,[name="totalfee"]')
      : doc.querySelector('#discount,[name="discount"]');
    if (direct) return direct;
    const matcher = key === 'totalfee' ? /^(?:totalfee|totalfees)$/ : /^discount$/;
    for (const label of doc.querySelectorAll('td,th,label,strong,span')) {
      if (!matcher.test(normalizeKey(label.textContent))) continue;
      const input = label.closest('tr')?.querySelector('input:not([type="hidden"]),select,textarea') ||
        label.parentElement?.querySelector('input:not([type="hidden"]),select,textarea');
      if (input) return input;
    }
    return null;
  }

  function updateFeeControls(doc) {
    if (!feeContext || feeContext.frame.contentDocument !== doc) return;
    for (const key of Object.keys(feeControls)) {
      const source = findFeeInput(doc, key);
      feeContext.inputs[key] = source;
      const target = feeControls[key];
      if (!target) continue;
      if (!source) { target.disabled = true; continue; }
      if (target.value !== source.value) target.value = source.value;
      target.type = source.type === 'number' ? 'number' : 'text';
      target.readOnly = source.readOnly;
      target.placeholder = source.placeholder || '';
      target.disabled = source.disabled;
      target.required = source.required;
      target.min = source.min || '';
      target.max = source.max || '';
      target.step = source.step || 'any';
    }
    const submit = doc.querySelector('#button2,input[name="submit"][type="submit"]');
    feeContext.submitButton = submit;
    const sBtn = feeQuickForm ? feeQuickForm.querySelector('button[type="submit"]') : null;
    if (sBtn) sBtn.disabled = !submit || submit.disabled || Object.values(feeContext.inputs).some((input) => !input);
  }

  feeQuickForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const context = feeContext;
    if (!context || context.submitted || !context.form || !context.submitButton) return;
    setFeeMessage('');
    context.beforeSubmit = readReceiptFields(context.frame.contentDocument);
    context.refreshingAfterSubmit = false;
    context.receiptOpened = false;
    context.requestingFromDashboard = true;
    for (const [key, source] of Object.entries(context.inputs)) {
      source.value = feeControls[key].value;
      source.dispatchEvent(new context.frame.contentWindow.Event('input', { bubbles: true }));
      source.dispatchEvent(new context.frame.contentWindow.Event('change', { bubbles: true }));
    }
    try {
      context.form.requestSubmit(context.submitButton);
    } catch (error) {
      context.requestingFromDashboard = false;
      setFeeLoading(false);
      setFeeMessage('The ERP fee form could not be submitted. Reload the student fee details and try again.', true);
      app.log('Could not submit the original fee form', error);
    }
    window.setTimeout(() => {
      if (feeContext === context && context.requestingFromDashboard) {
        context.requestingFromDashboard = false;
        setFeeMessage('The ERP did not accept the fee form. Check the amount fields and submit again.', true);
      }
    }, 0);
  });

  function addFrame(container, url, kind, student) {
    container.querySelectorAll(`.erp-source-${kind}`).forEach((oldFrame) => oldFrame.remove());
    const frame = document.createElement('iframe');
    frame.className = `erp-source-frame erp-source-${kind}`;
    frame.title = kind === 'student' ? 'Hidden admission record data source' : 'Hidden ERP fee transaction data source';
    frame.loading = 'eager';
    frame.referrerPolicy = 'same-origin';
    frame.hidden = true;
    frame.src = url;
    container.appendChild(frame);

    if (kind === 'student') {
      const editUrl = new URL('studentedit.php', app.baseUrl);
      editUrl.searchParams.set('stuid', student.id);
      editUrl.searchParams.set('sessid', currentSessionId());
      frame.addEventListener('load', () => {
        try {
          const doc = frame.contentDocument;
          if (!doc?.body || !frame.isConnected) return;
          selectedAdmissionRecord = extractAdmissionRecord(doc);
          selectedAdmissionStudentId = String(student.id);
          const fields = extractAdmissionData(doc);
          renderStudent(fields, student, editUrl.href);
          if (admissionPrintButton) admissionPrintButton.disabled = !selectedAdmissionRecord?.Name;
          if (enrollmentPrintButton) enrollmentPrintButton.disabled = !selectedAdmissionRecord?.Name;
          if (tcPrintButton) tcPrintButton.disabled = !selectedAdmissionRecord?.Name;
        } catch (error) {
          setCardStatus(cards[0], 'Student details unavailable', 'error');
          app.log('Could not read admission form in hidden frame', error);
        }
      }, { once: true });
      return frame;
    }

    if (feeContext) {
      feeContext.updateObserver?.disconnect();
      window.clearTimeout(feeContext.refreshTimeout);
      window.clearTimeout(feeContext.updateTimer);
    }
    const context = {
      frame, url, student, form: null, submitButton: null, inputs: {},
      submitted: false, requestingFromDashboard: false, refreshingAfterSubmit: false, receiptOpened: false,
      beforeSubmit: null, refreshTimeout: 0, updateObserver: null, updateTimer: 0
    };
    feeContext = context;

    const finishPayment = (doc, fresh) => {
      if (!context.refreshingAfterSubmit || context.receiptOpened) return;
      const previous = context.beforeSubmit || { transactions: [], paid: 0 };
      const hasNewPayment = fresh.transactions.length > previous.transactions.length || fresh.paid > previous.paid + 0.005;
      if (!fresh.name || !fresh.total || !hasNewPayment) return;
      context.receiptOpened = true;
      context.refreshingAfterSubmit = false;
      window.clearTimeout(context.refreshTimeout);
      setFeeLoading(false);
      setCardStatus(cards[1], 'Receipt ready', 'ready');
      const now = new Date();
      const pad = (part) => String(part).padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const hours = now.getHours() % 12 || 12;
      const currentDateTime = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(hours)}:${pad(now.getMinutes())} ${ampm}`;
      const receiptPayload = {
        studentName: fresh.name,
        fatherName: fresh.father,
        scholarNo: fresh.scholar,
        className: fresh.className,
        academicYear: fresh.academicYear,
        mobileNumber: fresh.mobile,
        currentDateTime,
        transactions: fresh.transactions,
        totalAmount: fresh.total,
        discount: fresh.discount,
        payableAmount: fresh.payable,
        dueAmount: fresh.due,
        paidAmount: fresh.paid
      };
      if (window.AndroidBridge && window.AndroidBridge.openPrintPage) {
        window.AndroidBridge.openPrintPage('openSchoolErpReceipt', JSON.stringify(receiptPayload));
      } else {
        app.log('AndroidBridge not found for openSchoolErpReceipt');
        setFeeMessage('The payment was recorded, but the custom receipt could not be opened.', true);
      }
    };

    const refreshFeeView = (doc) => {
      if (feeContext !== context || !frame.isConnected) return;
      const fresh = renderFeeSummary(doc);
      updateFeeControls(doc);
      if (fresh.name) setCardStatus(cards[1], context.refreshingAfterSubmit ? 'Updating fee status…' : 'Fee details loaded', 'ready');
      finishPayment(doc, fresh);
    };

    const installFeePage = (doc) => {
      if (!doc?.body || feeContext !== context) return;
      if (!doc.querySelector('#main-content')) {
        if (context.submitted) {
          context.submitted = false;
          context.refreshingAfterSubmit = true;
          setFeeLoading(true, 'Updating fee status…');
          setCardStatus(cards[1], 'Updating fee status…', 'busy');
          window.setTimeout(() => {
            if (feeContext === context && frame.isConnected) frame.contentWindow.location.replace(url);
          }, 200);
        } else {
          setCardStatus(cards[1], context.refreshingAfterSubmit ? 'Fee refresh failed' : 'Fee page unavailable', 'error');
          setFeeLoading(false);
          setFeeMessage('The ERP fee page did not load in the dashboard. Use “Open full fee receipt” to continue.', true);
        }
        return;
      }
      if (context.submitted) {
        context.submitted = false;
        context.refreshingAfterSubmit = true;
        setFeeLoading(true, 'Updating fee status…');
        setCardStatus(cards[1], 'Updating fee status…', 'busy');
        window.setTimeout(() => {
          if (feeContext === context && frame.isConnected) frame.contentWindow.location.replace(url);
        }, 200);
        return;
      }
      context.form = doc.querySelector('#form');
      if (!context.form) {
        setCardStatus(cards[1], 'Fee form unavailable', 'error');
        setFeeLoading(false);
        return;
      }
      setCardStatus(cards[1], context.refreshingAfterSubmit ? 'Updating fee status…' : 'Ready to collect', context.refreshingAfterSubmit ? 'busy' : 'ready');
      refreshFeeView(doc);
      context.updateObserver?.disconnect();
      const target = doc.querySelector('#getstudet');
      if (target) {
        context.updateObserver = new MutationObserver(() => {
          window.clearTimeout(context.updateTimer);
          context.updateTimer = window.setTimeout(() => refreshFeeView(doc), 180);
        });
        context.updateObserver.observe(target, {
          childList: true, subtree: true, characterData: true,
          attributes: true, attributeFilter: ['disabled', 'readonly']
        });
      }
      context.form.addEventListener('submit', (event) => {
        if (event.defaultPrevented) return;
        if (context.submitted) { event.preventDefault(); return; }
        context.submitted = true;
        context.requestingFromDashboard = false;
        context.beforeSubmit = readReceiptFields(doc);
        context.updateObserver?.disconnect();
        window.clearTimeout(context.updateTimer);
        setFeeLoading(true, 'Submitting fee…');
        setCardStatus(cards[1], 'Submitting payment…', 'busy');
      });
      if (context.refreshingAfterSubmit) {
        context.refreshTimeout = window.setTimeout(() => {
          if (!context.refreshingAfterSubmit || context.receiptOpened || feeContext !== context) return;
          context.refreshingAfterSubmit = false;
          setFeeLoading(false);
          setCardStatus(cards[1], 'Payment not confirmed', 'error');
          setFeeMessage('The ERP has not shown an updated receipt yet. Check the fee account before submitting again.', true);
        }, 45000);
      }
    };

    frame.addEventListener('load', () => {
      try { installFeePage(frame.contentDocument); }
      catch (error) {
        setCardStatus(cards[1], 'Fee details unavailable', 'error');
        setFeeLoading(false);
        app.log('Could not read fee page in hidden frame', error);
      }
    });
    return frame;
  }

  app.dashboardLoadStudent = (student) => {
    if (!student?.id) return;
    const sessionId = currentSessionId();
    const editUrl = new URL('studentedit.php', app.baseUrl);
    editUrl.searchParams.set('stuid', student.id);
    editUrl.searchParams.set('sessid', sessionId);
    const admissionUrl = new URL('admission_form_value.php', app.baseUrl);
    admissionUrl.searchParams.set('stuid', student.id);
    const feeUrl = new URL(app.routes.fee, app.baseUrl);
    feeUrl.searchParams.set('stuid', student.id);
    feeUrl.searchParams.set('sessid', sessionId);
    for (const card of cards) setCardStatus(card, 'Loading record…', 'busy');
    selectedAdmissionRecord = null;
    selectedAdmissionStudentId = String(student.id);
    if (admissionPrintButton) {
      admissionPrintButton.disabled = true;
      if (admissionPrintButton.firstChild) admissionPrintButton.firstChild.textContent = 'Print admission form ';
    }
    if (enrollmentPrintButton) enrollmentPrintButton.disabled = true;
    if (tcPrintButton) tcPrintButton.disabled = true;
    studentBody.replaceChildren(document.createElement('div'));
    studentBody.firstElementChild.className = 'erp-workspace-empty';
    studentBody.firstElementChild.innerHTML = '<span>01</span><strong>Loading admission details…</strong><small>Reading the student record from the ERP.</small>';
    feeSummarySignature = '';
    feeSummary.querySelector('.erp-fee-summary-head strong').textContent = 'Fee account';
    feeSummary.querySelector('.erp-fee-summary-head small').textContent = '';
    feeMetricValues.forEach((value) => { value.textContent = '—'; });
    for (const control of Object.values(feeControls)) {
      if (control) {
        control.value = '';
        control.disabled = true;
        control.readOnly = false;
      }
    }
    const sBtn2 = feeQuickForm ? feeQuickForm.querySelector('button[type="submit"]') : null;
    if (sBtn2) sBtn2.disabled = true;
    setFeeLoading(false);
    setFeeMessage('');
    for (const link of openLinks) {
      const direct = new URL(link.dataset.open === 'edit' ? 'studentedit.php' : app.routes.fee, app.baseUrl);
      direct.searchParams.set('stuid', student.id);
      direct.searchParams.set('sessid', sessionId);
      link.href = direct.href;
      link.removeAttribute('aria-disabled');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.onclick = (e) => {
        e.preventDefault();
        window.location.href = direct.href;
      };
    }
    addFrame(studentBody, admissionUrl.href, 'student', student);
    addFrame(feeBody, feeUrl.href, 'fee', student);
    app.log('Loaded both student workspaces', student.id);
  };
})();

(() => {
  'use strict';
  const app = window.__SCHOOL_ERP_CONSOLE__;
  if (!app) return;

  const CLASS_MAP = [
    { id: '2', name: 'Play Group', display: 'Play Group' },
    { id: '3', name: 'Nur', display: 'Nur' },
    { id: '4', name: 'LKG', display: 'LKG' },
    { id: '5', name: 'UKG', display: 'UKG' },
    { id: '6', name: '1st', display: '1st' },
    { id: '7', name: '2nd', display: '2nd' },
    { id: '8', name: '3rd', display: '3rd' },
    { id: '9', name: '4th', display: '4th' },
    { id: '10', name: '5th', display: '5th' },
    { id: '11', name: '6th', display: '6th' },
    { id: '12', name: '7th', display: '7th' },
    { id: '13', name: '8th', display: '8th' },
    { id: '14', name: '9th', display: '9th' },
    { id: '15', name: '10th', display: '10th' },
    { id: '16', name: '11th', display: '11th' },
    { id: '17', name: '12th', display: '12th' }
  ];

  function getUserAvailableClasses() {
    const bridge = window.AndroidBridge;
    const allowedClasses = (bridge && bridge.getAllowedClasses)
      ? JSON.parse(bridge.getAllowedClasses() || '[]')
      : [];
    const allowedClassIds = (bridge && bridge.getAllowedClassIds)
      ? JSON.parse(bridge.getAllowedClassIds() || '[]')
      : [];

    if (allowedClasses.length > 0) {
      return CLASS_MAP.filter(c => {
        return allowedClasses.some(ac => ac.toLowerCase() === c.name.toLowerCase()) ||
               allowedClassIds.includes(c.id);
      });
    }

    return CLASS_MAP;
  }

  async function fetchSectionsForClass(clsId) {
    try {
      const res = await fetch(`getsection_multi_cls.php?q=${encodeURIComponent(clsId)}&schlid=1`, { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${text}</div>`, 'text/html');
        const options = Array.from(doc.querySelectorAll('option'));
        const ids = options.map(o => o.value.trim()).filter(v => v && /^\d+$/.test(v));
        if (ids.length > 0) return Array.from(new Set(ids));
        const matches = Array.from(text.matchAll(/value=["']?(\d+)["']?/gi)).map(m => m[1]);
        if (matches.length > 0) return Array.from(new Set(matches));
      }
    } catch (e) {
      console.warn('Could not fetch sections', e);
    }
    return [];
  }

  async function fetchClassReportHtml(clsId) {
    const sections = await fetchSectionsForClass(clsId);

    const params = new URLSearchParams();
    params.set('schlid', '1');
    params.set('id', '13');
    params.set('sessid', '6');
    params.set('vsession', '2026-2027');
    params.set('stutype', 'All');
    params.set('admtype', 'All');
    params.append('clsid[]', String(clsId));

    if (sections.length > 0) {
      sections.forEach(s => params.append('secid[]', s));
    } else {
      params.append('secid[]', 'All');
    }

    params.set('egroup', 'All');
    params.set('smedium', 'All');
    params.set('cast', 'All');
    params.set('houseid', '0');
    params.set('faclty', 'All');
    params.append('routeid[]', 'All');
    params.set('vehicle_id', '0');
    params.set('cstate', 'All');
    params.set('sdate', '');
    params.set('edate', '');
    params.set('account_status', 'Active');
    params.set('cstatus', 'Active');
    params.set('sdob', '');
    params.set('edob', '');
    params.set('account_type', 'All');
    params.append('tag_id[]', 'All');
    params.set('remark', '');
    params.set('login_count', 'All');
    params.set('gender', 'All');
    params.set('paddr', '');
    params.set('img_download', 'No');
    params.set('image_status', 'All');
    params.set('csort', 'name');
    params.set('consultant_id', '0');
    params.set('display_type', 'view');

    ['a81', 'a76', 'a75', 'a3', 'a4', 'a5', 'a7', 'a8', 'a9', 'a12', 'a13', 'a14', 'a15', 'a16', 'a19', 'a23', 'a25', 'a37', 'a45'].forEach(f => {
      params.set(f, 'Y');
    });

    const url = 'student_dynamic1.php?' + params.toString();
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load report from server: ' + res.status);
    return await res.text();
  }

  function normalizeClass(name) {
    if (!name) return '';
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function parseStudentsFromReport(html, targetClass) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table.student-list') || doc.querySelector('table');
    if (!table) return { students: [], extraHeaders: [] };

    const headers = Array.from(table.querySelectorAll('thead th, thead td')).map(td => td.textContent.trim().replace(/\s+/g, ' '));

    function findIdx(regex, fallback) {
      const idx = headers.findIndex(h => regex.test(h));
      return idx >= 0 ? idx : fallback;
    }

    const idxAdm = findIdx(/adm.*no|scholar/i, 5);
    const idxRoll = findIdx(/roll.*no/i, 6);
    const idxName = findIdx(/student.*name|^name$/i, 9);
    const idxFather = findIdx(/father.*name/i, 12);
    const idxMother = findIdx(/mother.*name/i, 13);
    const idxMobile = findIdx(/father.*mobile|mobile/i, 14);
    const idxCategory = findIdx(/category|cast/i, 16);
    const idxChild = findIdx(/child.*id|samagra/i, 7);
    const idxAadhar = findIdx(/aadhar|uid/i, 8);
    const idxClass = findIdx(/^class$/i, 1);

    const knownIndices = new Set([
      0, // Sno
      idxClass,
      idxAdm,
      idxRoll,
      idxName,
      idxFather,
      idxMother,
      idxMobile,
      idxCategory,
      idxChild,
      idxAadhar
    ]);

    const extraHeaders = [];
    headers.forEach((h, i) => {
      if (!knownIndices.has(i) && h && h.trim().length > 0) {
        extraHeaders.push({ index: i, name: h.trim() });
      }
    });

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const students = [];
    const targetNorm = normalizeClass(targetClass);

    rows.forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
      if (cells.length < 8) return;

      const adm = (cells[idxAdm] || '').trim();
      const name = (cells[idxName] || '').trim();
      if (!adm && !name) return;

      // Filter by target class if available to ensure only selected class students are included
      if (targetNorm && idxClass >= 0 && idxClass < cells.length) {
        const rowClassNorm = normalizeClass(cells[idxClass]);
        if (rowClassNorm && rowClassNorm !== targetNorm) {
          return;
        }
      }

      const extras = extraHeaders.map(eh => (cells[eh.index] || '').trim() || '—');

      students.push({
        sNo: students.length + 1,
        admNo: adm || '—',
        rollNo: (cells[idxRoll] || '').trim() || '—',
        name: name || '—',
        fatherName: (cells[idxFather] || '').trim() || '—',
        motherName: (cells[idxMother] || '').trim() || '—',
        mobile: (cells[idxMobile] || '').trim() || '',
        category: (cells[idxCategory] || '').trim() || '—',
        childId: (cells[idxChild] || '').trim() || '—',
        aadhar: (cells[idxAadhar] || '').trim() || '—',
        extras: extras
      });
    });

    return { students, extraHeaders };
  }

  app.initReportView = function(container) {
    if (container.dataset.initialized === 'true') {
      const hasContent = container.querySelector('#erp-sheet-content')?.childElementCount > 0;
      if (hasContent) return;
    }
    container.dataset.initialized = 'true';

    const availableClasses = getUserAvailableClasses();
    if (!availableClasses.length) {
      container.innerHTML = '<div class="erp-report-empty">No classes assigned to your account.</div>';
      return;
    }

    let activeClass = availableClasses[0];

    container.innerHTML = `
      <div class="erp-report-card">
        <div class="erp-report-header">
          <div class="erp-report-heading">
            <span class="erp-eyebrow">STUDENT MASTER RECORD</span>
            <h1 class="erp-report-title">Class ${activeClass.display} Student Report</h1>
          </div>
          <div class="erp-report-badge-wrap">
            <span class="erp-report-count-badge" id="erp-student-count-badge">Loading…</span>
          </div>
        </div>

        ${availableClasses.length > 1 ? `
        <div class="erp-class-selector-section">
          <label for="erp-class-dropdown" class="erp-class-selector-label">Available Classes:</label>
          <div class="erp-class-select-wrap">
            <select id="erp-class-dropdown" class="erp-class-select" aria-label="Available Classes">
              ${availableClasses.map(c => `
                <option value="${c.id}" data-name="${c.name}" data-display="${c.display}" ${c.id === activeClass.id ? 'selected' : ''}>
                  Class ${c.display}
                </option>
              `).join('')}
            </select>
          </div>
        </div>` : ''}

        <div class="erp-report-toolbar">
          <div class="erp-report-search-wrap">
            <span class="erp-search-icon" aria-hidden="true">⌕</span>
            <input type="search" id="erp-sheet-search" class="erp-sheet-search" placeholder="Search by name, adm no, roll no, mobile…" autocomplete="off">
          </div>
          <button type="button" id="erp-report-refresh-btn" class="erp-sheet-refresh-btn" title="Refresh sheet data">Refresh</button>
        </div>

        <div class="erp-report-table-container" id="erp-table-scroll-container">
          <div class="erp-report-loading" id="erp-sheet-loading">
            <span class="erp-report-spinner"></span>
            <p>Fetching Class ${activeClass.display} report from School ERP…</p>
          </div>
          <div id="erp-sheet-content"></div>
        </div>
      </div>
    `;

    const countBadge = container.querySelector('#erp-student-count-badge');
    const titleEl = container.querySelector('.erp-report-title');
    const loadingEl = container.querySelector('#erp-sheet-loading');
    const contentEl = container.querySelector('#erp-sheet-content');
    const searchInput = container.querySelector('#erp-sheet-search');
    const refreshBtn = container.querySelector('#erp-report-refresh-btn');
    const classDropdown = container.querySelector('#erp-class-dropdown');

    let currentStudents = [];
    let currentExtraHeaders = [];

    async function loadReportForClass(cls) {
      activeClass = cls;
      titleEl.textContent = `Class ${cls.display} Student Report`;
      countBadge.textContent = 'Loading…';
      loadingEl.style.display = 'flex';
      loadingEl.querySelector('p').textContent = `Fetching Class ${cls.display} report from School ERP…`;
      contentEl.innerHTML = '';
      searchInput.value = '';

      try {
        const html = await fetchClassReportHtml(cls.id);
        if (html.includes('Click Here To Login') || html.includes('logged in first')) {
          loadingEl.style.display = 'none';
          countBadge.textContent = 'Session Expired';
          contentEl.innerHTML = `
            <div class="erp-report-error">
              <p>⚠️ ERP session expired. Please log in again.</p>
              <a href="index.php" class="erp-btn-retry" style="display:inline-block; text-decoration:none; text-align:center;">Log In</a>
            </div>
          `;
          return;
        }
        const parsed = parseStudentsFromReport(html, cls.display || cls.name);
        currentStudents = parsed.students;
        currentExtraHeaders = parsed.extraHeaders;
        loadingEl.style.display = 'none';
        countBadge.textContent = `Total: ${currentStudents.length} Students`;
        renderTableRows(currentStudents, currentExtraHeaders);
      } catch (err) {
        loadingEl.style.display = 'none';
        countBadge.textContent = 'Error';
        contentEl.innerHTML = `
          <div class="erp-report-error">
            <p>⚠️ Unable to load report for Class ${cls.display}: ${err.message}</p>
            <button type="button" class="erp-btn-retry" id="erp-report-retry-btn">Retry</button>
          </div>
        `;
        container.querySelector('#erp-report-retry-btn')?.addEventListener('click', () => loadReportForClass(cls));
      }
    }

    function renderTableRows(list, extraHeaders = currentExtraHeaders) {
      if (!list.length) {
        contentEl.innerHTML = '<div class="erp-report-no-data">No student records found in this class.</div>';
        return;
      }

      const extraThHtml = (extraHeaders || []).map(eh => `<th>${eh.name}</th>`).join('');

      let html = `
        <table class="erp-student-sheet-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">#</th>
              <th>Adm No</th>
              <th>Roll No</th>
              <th>Student Name</th>
              <th>Father's Name</th>
              <th>Mother's Name</th>
              <th>Father Mobile No</th>
              <th>Category</th>
              <th>Child ID</th>
              <th>Aadhar Card</th>
              ${extraThHtml}
            </tr>
          </thead>
          <tbody>
      `;

      list.forEach((s, idx) => {
        const mobileHtml = s.mobile && s.mobile !== '—'
          ? `<a href="tel:${s.mobile}" class="erp-phone-link" title="Call ${s.mobile}">Call ${s.mobile}</a>`
          : '<span class="erp-text-muted">—</span>';

        const extraTdHtml = (s.extras || []).map(val => `<td>${val || '—'}</td>`).join('');

        html += `
          <tr data-index="${idx}">
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td class="erp-td-adm"><strong>${s.admNo}</strong></td>
            <td>${s.rollNo}</td>
            <td class="erp-td-name"><strong>${s.name}</strong></td>
            <td>${s.fatherName}</td>
            <td>${s.motherName}</td>
            <td>${mobileHtml}</td>
            <td><span class="erp-cat-badge">${s.category}</span></td>
            <td>${s.childId}</td>
            <td class="erp-td-aadhar">${s.aadhar}</td>
            ${extraTdHtml}
          </tr>
        `;
      });

      html += '</tbody></table>';
      contentEl.innerHTML = html;

      const rows = contentEl.querySelectorAll('tbody tr');
      rows.forEach(tr => {
        tr.addEventListener('click', () => {
          rows.forEach(r => r.classList.remove('erp-row-highlighted'));
          tr.classList.add('erp-row-highlighted');
        });
      });
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        countBadge.textContent = `Total: ${currentStudents.length} Students`;
        renderTableRows(currentStudents, currentExtraHeaders);
        return;
      }
      const filtered = currentStudents.filter(s => {
        return s.name.toLowerCase().includes(q) ||
               s.admNo.toLowerCase().includes(q) ||
               s.rollNo.toLowerCase().includes(q) ||
               s.mobile.toLowerCase().includes(q) ||
               s.fatherName.toLowerCase().includes(q) ||
               s.motherName.toLowerCase().includes(q) ||
               s.childId.toLowerCase().includes(q) ||
               s.aadhar.toLowerCase().includes(q) ||
               (s.extras || []).some(extra => (extra || '').toLowerCase().includes(q));
      });
      countBadge.textContent = `Showing ${filtered.length} of ${currentStudents.length}`;
      renderTableRows(filtered, currentExtraHeaders);
    });

    refreshBtn.addEventListener('click', () => loadReportForClass(activeClass));

    if (classDropdown) {
      classDropdown.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        const clsId = e.target.value;
        const clsName = opt.dataset.name;
        const clsDisplay = opt.dataset.display;
        loadReportForClass({ id: clsId, name: clsName, display: clsDisplay });
      });
    }

    loadReportForClass(activeClass);
  };

  async function fetchClassFeeHtml(clsId) {
    const params = new URLSearchParams();
    params.set('schlid', '1');
    params.set('sessid', '6');
    params.set('vsession', '2026-2027');
    params.append('clsid[]', String(clsId));
    params.set('secid', '0');
    params.set('egroup', 'All');
    params.set('smedium', 'All');
    params.set('faclty', 'All');
    params.append('routeid[]', 'All');
    params.set('vehicle_id', '0');
    params.set('admtype', 'All');
    params.set('stutype', 'All');
    params.set('s1', '3'); // March ("upto march")
    params.set('scount_status', 'Active');
    params.set('paddr', '');
    params.set('last_pdate', '');
    params.set('csort', 'name'); // Sort by Name from ERP backend

    // Required checkboxes:
    // class (4), section (5), scholar (7), name (8), father (9), mobile (10), route (13), total (15), discount (21), currently received (23), net due (26), net payable after discount (34)
    ['4', '5', '7', '8', '9', '10', '13', '15', '21', '23', '26', '34'].forEach(c => {
      params.append('chk[]', c);
    });

    const res = await fetch('studuefeedet1.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to load fee statement from server: ' + res.status);
    return await res.text();
  }

  function parseStudentsFromFeeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table#table2excel') || doc.querySelector('table.k') || doc.querySelector('table');
    if (!table) return { students: [], totals: null };

    const trs = Array.from(table.querySelectorAll('tr'));
    let headerCells = [];
    let headerTrIdx = -1;

    for (let i = 0; i < trs.length; i++) {
      const tds = Array.from(trs[i].querySelectorAll('td, th'));
      const txts = tds.map(td => td.textContent.trim().toLowerCase());
      if (txts.includes('scholar no') || txts.includes('name') || txts.some(t => t.includes('scholar'))) {
        headerCells = txts;
        headerTrIdx = i;
        break;
      }
    }

    if (!headerCells.length) return { students: [], totals: null };

    function findIdx(sub, fallback) {
      const idx = headerCells.findIndex(h => h.includes(sub));
      return idx >= 0 ? idx : fallback;
    }

    const idxSno = findIdx('sno', 0);
    const idxScholar = findIdx('scholar no', 7);
    const idxName = findIdx('name', 8);
    const idxFather = findIdx("father's name", 9);
    const idxMobile = findIdx('mobile', 10);
    const idxTotal = findIdx('total amount', 19);
    const idxDiscount = findIdx('discount amount', 27);
    const idxPayable = findIdx('net payable amount', 28);
    const idxCurrRec = findIdx('currently received', 30);
    const idxDue = findIdx('net due amount', 34);

    function parseNum(val) {
      if (val === undefined || val === null) return 0;
      const cleaned = String(val).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }

    const students = [];
    let totalsRow = null;

    for (let i = headerTrIdx + 1; i < trs.length; i++) {
      const tds = Array.from(trs[i].querySelectorAll('td, th'));
      if (tds.length < headerCells.length) continue;

      const firstCellText = (tds[idxSno]?.textContent || '').trim();
      const nameText = (tds[idxName]?.textContent || '').trim();

      // Check if totals row
      if (nameText.toLowerCase().includes('total') || (!firstCellText && nameText.toLowerCase().includes('total'))) {
        if (!totalsRow) {
          const totTotal = parseNum(tds[idxTotal]?.textContent);
          const totDisc = parseNum(tds[idxDiscount]?.textContent);
          const totPayable = parseNum(tds[idxPayable]?.textContent);
          const totCurrRec = parseNum(tds[idxCurrRec]?.textContent);
          const totRec = Math.max(0, totCurrRec - totDisc);
          const totDue = Math.max(0, totPayable - totRec);
          totalsRow = {
            total: totTotal,
            payable: totPayable,
            received: totRec,
            due: totDue
          };
        }
        continue;
      }

      // Check if student row
      if (!firstCellText.match(/^\d+$/) && !tds[idxSno]?.querySelector('a')) {
        continue;
      }

      const scholarNo = (tds[idxScholar]?.textContent || '').trim() || '—';
      const studentName = nameText || '—';
      const fatherName = (tds[idxFather]?.textContent || '').trim() || '—';
      const rawMobile = (tds[idxMobile]?.textContent || '').trim();
      const mobileClean = rawMobile.replace(/[^0-9+]/g, '');
      const mobile = mobileClean.length >= 7 ? mobileClean : '';

      const totalVal = parseNum(tds[idxTotal]?.textContent);
      const discountVal = parseNum(tds[idxDiscount]?.textContent);
      const payableVal = parseNum(tds[idxPayable]?.textContent);
      const currRecVal = parseNum(tds[idxCurrRec]?.textContent);

      // User's exact required calculation formulas:
      // received = currently received - discount amount
      // due = net payable after discount - received
      const recVal = Math.max(0, currRecVal - discountVal);
      const dueVal = Math.max(0, payableVal - recVal);

      // Feature engineered 3 installments of payable amount:
      // approx 35% in 1st, approx 35% in 2nd, approx 30% in 3rd.
      // Amounts are multiples of 100, and sum strictly equals payableVal.
      let inst1 = Math.round((payableVal * 0.35) / 100) * 100;
      let inst2 = Math.round((payableVal * 0.35) / 100) * 100;
      let inst3 = payableVal - (inst1 + inst2);
      if (inst3 < 0) {
        inst3 = 0;
        if (inst2 > payableVal - inst1) inst2 = Math.max(0, payableVal - inst1);
      }

      // Exhaust received against installments sequentially to find amount remaining in each:
      let tempRec = recVal;
      let rem1 = 0;
      if (tempRec >= inst1) {
        rem1 = 0;
        tempRec -= inst1;
      } else {
        rem1 = inst1 - tempRec;
        tempRec = 0;
      }

      let rem2 = 0;
      if (tempRec >= inst2) {
        rem2 = 0;
        tempRec -= inst2;
      } else {
        rem2 = inst2 - tempRec;
        tempRec = 0;
      }

      let rem3 = 0;
      if (tempRec >= inst3) {
        rem3 = 0;
        tempRec = 0;
      } else {
        rem3 = inst3 - tempRec;
        tempRec = 0;
      }

      // Scheduled due based on present date:
      // July, Aug: 1st
      // Sept - Dec: 1st + 2nd
      // Jan - March / after March: all sum (1st + 2nd + 3rd)
      // April - June: 1st
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1 to 12
      let currentDueVal = rem1;
      if (currentMonth === 7 || currentMonth === 8) {
        currentDueVal = rem1;
      } else if (currentMonth >= 9 && currentMonth <= 12) {
        currentDueVal = rem1 + rem2;
      } else if (currentMonth >= 1 && currentMonth <= 3) {
        currentDueVal = rem1 + rem2 + rem3;
      } else {
        currentDueVal = rem1;
      }

      students.push({
        sNo: students.length + 1,
        scholarNo,
        name: studentName,
        fatherName,
        mobile,
        total: totalVal,
        payable: payableVal,
        received: recVal,
        due: dueVal,
        currentDue: currentDueVal,
        inst1,
        inst2,
        inst3,
        rem1,
        rem2,
        rem3
      });
    }

    if (!totalsRow && students.length > 0) {
      totalsRow = {
        total: students.reduce((sum, s) => sum + s.total, 0),
        payable: students.reduce((sum, s) => sum + s.payable, 0),
        received: students.reduce((sum, s) => sum + s.received, 0),
        due: students.reduce((sum, s) => sum + s.due, 0),
        currentDue: students.reduce((sum, s) => sum + s.currentDue, 0),
        rem1: students.reduce((sum, s) => sum + s.rem1, 0),
        rem2: students.reduce((sum, s) => sum + s.rem2, 0),
        rem3: students.reduce((sum, s) => sum + s.rem3, 0)
      };
    }

    return { students, totals: totalsRow };
  }

  app.initFeeView = function(container) {
    if (container.dataset.initialized === 'true') {
      const hasContent = container.querySelector('#erp-fee-sheet-content')?.childElementCount > 0;
      if (hasContent) return;
    }
    container.dataset.initialized = 'true';

    const availableClasses = getUserAvailableClasses();
    if (!availableClasses.length) {
      container.innerHTML = '<div class="erp-report-empty">No classes assigned to your account.</div>';
      return;
    }

    let activeClass = availableClasses[0];

    container.innerHTML = `
      <div class="erp-report-card erp-fee-card-sheet">
        <div class="erp-report-header">
          <div class="erp-report-heading">
            <span class="erp-eyebrow">CLASS FEE STATEMENT</span>
            <h1 class="erp-fee-title">Class ${activeClass.display} Fee Statement</h1>
          </div>
          <div class="erp-report-badge-wrap">
            <span class="erp-report-count-badge" id="erp-fee-count-badge">Loading…</span>
          </div>
        </div>

        ${availableClasses.length > 1 ? `
        <div class="erp-class-selector-section">
          <label for="erp-fee-class-dropdown" class="erp-class-selector-label">Available Classes:</label>
          <div class="erp-class-select-wrap">
            <select id="erp-fee-class-dropdown" class="erp-class-select" aria-label="Available Classes">
              ${availableClasses.map(c => `
                <option value="${c.id}" data-name="${c.name}" data-display="${c.display}" ${c.id === activeClass.id ? 'selected' : ''}>
                  Class ${c.display}
                </option>
              `).join('')}
            </select>
          </div>
        </div>` : ''}

        <div class="erp-report-toolbar erp-fee-toolbar">
          <div class="erp-report-search-wrap">
            <span class="erp-search-icon" aria-hidden="true">⌕</span>
            <input type="search" id="erp-fee-search" class="erp-sheet-search" placeholder="Search by name, father, scholar no…" autocomplete="off">
          </div>
          <div class="erp-fee-sort-wrap">
            <select id="erp-fee-sort-dropdown" class="erp-class-select erp-fee-sort-select" aria-label="Sort students">
              <option value="name_asc" selected>Sort by Name (A-Z)</option>
              <option value="name_desc">Sort by Name (Z-A)</option>
              <option value="currentDue_desc">Sort by Current Due (Highest First)</option>
              <option value="currentDue_asc">Sort by Current Due (Lowest First)</option>
              <option value="due_desc">Sort by Total Due (Highest First)</option>
              <option value="due_asc">Sort by Total Due (Lowest First)</option>
              <option value="rem1_desc">Sort by 1st Inst Due</option>
              <option value="rem2_desc">Sort by 2nd Inst Due</option>
              <option value="rem3_desc">Sort by 3rd Inst Due</option>
              <option value="scholar_asc">Sort by Scholar No</option>
              <option value="total_desc">Sort by Total Amount</option>
            </select>
          </div>
          <button type="button" id="erp-fee-refresh-btn" class="erp-sheet-refresh-btn" title="Refresh fee sheet data">Refresh</button>
        </div>

        <div class="erp-report-table-container erp-fee-table-container" id="erp-fee-scroll-container">
          <div class="erp-report-loading" id="erp-fee-loading">
            <span class="erp-report-spinner"></span>
            <p>Fetching Class ${activeClass.display} fee statement from School ERP…</p>
          </div>
          <div id="erp-fee-sheet-content"></div>
        </div>
      </div>
    `;

    const countBadge = container.querySelector('#erp-fee-count-badge');
    const titleEl = container.querySelector('.erp-fee-title');
    const loadingEl = container.querySelector('#erp-fee-loading');
    const contentEl = container.querySelector('#erp-fee-sheet-content');
    const searchInput = container.querySelector('#erp-fee-search');
    const sortDropdown = container.querySelector('#erp-fee-sort-dropdown');
    const refreshBtn = container.querySelector('#erp-fee-refresh-btn');
    const classDropdown = container.querySelector('#erp-fee-class-dropdown');

    let currentStudents = [];
    let currentSortField = 'name';
    let currentSortOrder = 'asc';

    function sortStudentsList(arr, field, order) {
      return [...arr].sort((a, b) => {
        let cmp = 0;
        if (field === 'name') {
          cmp = (a.name || '').localeCompare(b.name || '');
        } else if (field === 'father') {
          cmp = (a.fatherName || '').localeCompare(b.fatherName || '');
        } else if (field === 'scholar') {
          const numA = parseInt(a.scholarNo, 10) || 0;
          const numB = parseInt(b.scholarNo, 10) || 0;
          cmp = numA - numB;
        } else if (field === 'currentDue') {
          cmp = (a.currentDue || 0) - (b.currentDue || 0);
        } else if (field === 'due') {
          cmp = (a.due || 0) - (b.due || 0);
        } else if (field === 'total') {
          cmp = (a.total || 0) - (b.total || 0);
        } else if (field === 'payable') {
          cmp = (a.payable || 0) - (b.payable || 0);
        } else if (field === 'received') {
          cmp = (a.received || 0) - (b.received || 0);
        } else if (field === 'rem1') {
          cmp = (a.rem1 || 0) - (b.rem1 || 0);
        } else if (field === 'rem2') {
          cmp = (a.rem2 || 0) - (b.rem2 || 0);
        } else if (field === 'rem3') {
          cmp = (a.rem3 || 0) - (b.rem3 || 0);
        }
        return order === 'asc' ? cmp : -cmp;
      });
    }

    function applyFilterAndSort() {
      const q = (searchInput?.value || '').trim().toLowerCase();
      let filtered = currentStudents;
      if (q) {
        filtered = currentStudents.filter(s => {
          return (s.scholarNo && s.scholarNo.toLowerCase().includes(q)) ||
                 (s.name && s.name.toLowerCase().includes(q)) ||
                 (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
                 (s.mobile && s.mobile.includes(q));
        });
        countBadge.textContent = `Showing ${filtered.length} of ${currentStudents.length}`;
      } else {
        countBadge.textContent = `Total: ${currentStudents.length} Students`;
      }

      const sorted = sortStudentsList(filtered, currentSortField, currentSortOrder);
      renderTableRows(sorted);
    }

    async function loadFeeForClass(cls) {
      activeClass = cls;
      titleEl.textContent = `Class ${cls.display} Fee Statement`;
      countBadge.textContent = 'Loading…';
      loadingEl.style.display = 'flex';
      loadingEl.querySelector('p').textContent = `Fetching Class ${cls.display} fee statement from School ERP…`;
      contentEl.innerHTML = '';
      if (searchInput) searchInput.value = '';

      try {
        const html = await fetchClassFeeHtml(cls.id);
        if (html.includes('Click Here To Login') || html.includes('logged in first')) {
          loadingEl.style.display = 'none';
          countBadge.textContent = 'Session Expired';
          contentEl.innerHTML = `
            <div class="erp-report-error">
              <p>⚠️ ERP session expired. Please log in again.</p>
              <a href="index.php" class="erp-btn-retry" style="display:inline-block; text-decoration:none; text-align:center;">Log In</a>
            </div>
          `;
          return;
        }

        const parsed = parseStudentsFromFeeHtml(html);
        currentStudents = parsed.students;
        // Default sort by student name
        currentStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        loadingEl.style.display = 'none';
        applyFilterAndSort();
      } catch (err) {
        loadingEl.style.display = 'none';
        countBadge.textContent = 'Error';
        contentEl.innerHTML = `
          <div class="erp-report-error">
            <p>⚠️ Unable to load fee statement for Class ${cls.display}: ${err.message}</p>
            <button type="button" class="erp-btn-retry" id="erp-fee-retry-btn">Retry</button>
          </div>
        `;
        container.querySelector('#erp-fee-retry-btn')?.addEventListener('click', () => loadFeeForClass(cls));
      }
    }

    function renderTableRows(list) {
      if (!list.length) {
        contentEl.innerHTML = '<div class="erp-report-no-data">No student records found in this class fee statement.</div>';
        return;
      }

      const sumTotal = list.reduce((acc, s) => acc + s.total, 0);
      const sumPayable = list.reduce((acc, s) => acc + s.payable, 0);
      const sumReceived = list.reduce((acc, s) => acc + s.received, 0);
      const sumDue = list.reduce((acc, s) => acc + s.due, 0);
      const sumCurrentDue = list.reduce((acc, s) => acc + s.currentDue, 0);
      const sumRem1 = list.reduce((acc, s) => acc + s.rem1, 0);
      const sumRem2 = list.reduce((acc, s) => acc + s.rem2, 0);
      const sumRem3 = list.reduce((acc, s) => acc + s.rem3, 0);

      const getSortIndicator = (field) => {
        if (currentSortField !== field) return '<span class="erp-sort-icon">↕</span>';
        return currentSortOrder === 'asc' ? '<span class="erp-sort-icon active">▲</span>' : '<span class="erp-sort-icon active">▼</span>';
      };

      // Ordered columns:
      // {#, name, due (current date schedule), father's name(dialer link), scholar no, total, payable, received, 1st Inst, 2nd Inst, 3rd Inst, due (total)}
      let html = `
        <table class="erp-student-sheet-table erp-fee-sheet-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">#</th>
              <th data-sort="name" class="erp-th-sortable" title="Click to sort by Name">Name ${getSortIndicator('name')}</th>
              <th style="text-align: right; width: 105px;" data-sort="currentDue" class="erp-th-sortable" title="Click to sort by Current Due">Due ${getSortIndicator('currentDue')}</th>
              <th data-sort="father" class="erp-th-sortable" title="Click to sort by Father Name">Father's Name ${getSortIndicator('father')}</th>
              <th style="width: 95px; text-align: center;" data-sort="scholar" class="erp-th-sortable" title="Click to sort by Scholar No">Scholar no ${getSortIndicator('scholar')}</th>
              <th style="text-align: right; width: 95px;" data-sort="total" class="erp-th-sortable" title="Click to sort by Total">Total ${getSortIndicator('total')}</th>
              <th style="text-align: right; width: 95px;" data-sort="payable" class="erp-th-sortable" title="Click to sort by Payable">Payable ${getSortIndicator('payable')}</th>
              <th style="text-align: right; width: 95px;" data-sort="received" class="erp-th-sortable" title="Click to sort by Received">Received ${getSortIndicator('received')}</th>
              <th style="text-align: right; width: 95px;" data-sort="rem1" class="erp-th-sortable" title="Click to sort by 1st Installment Due">1st Inst ${getSortIndicator('rem1')}</th>
              <th style="text-align: right; width: 95px;" data-sort="rem2" class="erp-th-sortable" title="Click to sort by 2nd Installment Due">2nd Inst ${getSortIndicator('rem2')}</th>
              <th style="text-align: right; width: 95px;" data-sort="rem3" class="erp-th-sortable" title="Click to sort by 3rd Installment Due">3rd Inst ${getSortIndicator('rem3')}</th>
              <th style="text-align: right; width: 105px;" data-sort="due" class="erp-th-sortable" title="Click to sort by Total Due">Due ${getSortIndicator('due')}</th>
            </tr>
          </thead>
          <tbody>
      `;

      list.forEach((s, idx) => {
        const fatherHtml = s.mobile
          ? `<a href="tel:${s.mobile}" class="erp-father-phone-link" title="Call father (${s.mobile})"><span>${s.fatherName}</span> <span class="erp-phone-dial-icon">📞</span></a>`
          : `<span>${s.fatherName}</span>`;

        html += `
          <tr data-index="${idx}">
            <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
            <td class="erp-td-name"><strong>${s.name}</strong></td>
            <td style="text-align: right; font-family: monospace, sans-serif; font-weight: 700;">
              ${s.currentDue > 0
                ? `<span class="erp-due-pill-unpaid">₹${Math.round(s.currentDue).toLocaleString('en-IN')}</span>`
                : `<span class="erp-due-pill-paid">Paid</span>`
              }
            </td>
            <td class="erp-td-father">${fatherHtml}</td>
            <td class="erp-td-adm" style="text-align: center;"><strong>${s.scholarNo}</strong></td>
            <td style="text-align: right; font-family: monospace, sans-serif; font-weight: 600;">₹${Math.round(s.total).toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-family: monospace, sans-serif; font-weight: 600;">₹${Math.round(s.payable).toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-family: monospace, sans-serif; font-weight: 600; color: ${s.received > 0 ? '#16a34a' : 'inherit'};">₹${Math.round(s.received).toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-family: monospace, sans-serif;">
              ${s.rem1 > 0
                ? `<span class="erp-inst-pill-due">₹${Math.round(s.rem1).toLocaleString('en-IN')}</span>`
                : `<span class="erp-inst-pill-paid">₹0</span>`
              }
            </td>
            <td style="text-align: right; font-family: monospace, sans-serif;">
              ${s.rem2 > 0
                ? `<span class="erp-inst-pill-due">₹${Math.round(s.rem2).toLocaleString('en-IN')}</span>`
                : `<span class="erp-inst-pill-paid">₹0</span>`
              }
            </td>
            <td style="text-align: right; font-family: monospace, sans-serif;">
              ${s.rem3 > 0
                ? `<span class="erp-inst-pill-due">₹${Math.round(s.rem3).toLocaleString('en-IN')}</span>`
                : `<span class="erp-inst-pill-paid">₹0</span>`
              }
            </td>
            <td style="text-align: right; font-family: monospace, sans-serif; font-weight: 700;">
              ${s.due > 0
                ? `<span class="erp-due-pill-unpaid">₹${Math.round(s.due).toLocaleString('en-IN')}</span>`
                : `<span class="erp-due-pill-paid">Paid</span>`
              }
            </td>
          </tr>
        `;
      });

      html += `
          </tbody>
          <tfoot>
            <tr class="erp-fee-total-row">
              <td style="text-align: center; font-weight: 800;">Σ</td>
              <td style="font-weight: 700;">Total (${list.length} Students)</td>
              <td style="text-align: right; font-weight: 800; font-family: monospace, sans-serif; color: ${sumCurrentDue > 0 ? '#dc2626' : '#16a34a'};">₹${Math.round(sumCurrentDue).toLocaleString('en-IN')}</td>
              <td colspan="2" style="text-align: center; color: var(--erp-muted);">—</td>
              <td style="text-align: right; font-weight: 800; font-family: monospace, sans-serif;">₹${Math.round(sumTotal).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 800; font-family: monospace, sans-serif;">₹${Math.round(sumPayable).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 800; font-family: monospace, sans-serif; color: #16a34a;">₹${Math.round(sumReceived).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 700; font-family: monospace, sans-serif; color: ${sumRem1 > 0 ? '#ea580c' : '#16a34a'};">₹${Math.round(sumRem1).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 700; font-family: monospace, sans-serif; color: ${sumRem2 > 0 ? '#ea580c' : '#16a34a'};">₹${Math.round(sumRem2).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 700; font-family: monospace, sans-serif; color: ${sumRem3 > 0 ? '#ea580c' : '#16a34a'};">₹${Math.round(sumRem3).toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: 800; font-family: monospace, sans-serif; color: ${sumDue > 0 ? '#dc2626' : '#16a34a'};">₹${Math.round(sumDue).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      `;

      contentEl.innerHTML = html;

      // Click to sort by column header
      contentEl.querySelectorAll('thead th.erp-th-sortable').forEach(th => {
        th.addEventListener('click', () => {
          const field = th.dataset.sort;
          if (currentSortField === field) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
          } else {
            currentSortField = field;
            currentSortOrder = (field === 'due' || field === 'currentDue' || field === 'total' || field === 'payable' || field === 'received' || field === 'rem1' || field === 'rem2' || field === 'rem3') ? 'desc' : 'asc';
          }
          if (sortDropdown) {
            const optVal = `${currentSortField}_${currentSortOrder}`;
            if (sortDropdown.querySelector(`option[value="${optVal}"]`)) {
              sortDropdown.value = optVal;
            }
          }
          applyFilterAndSort();
        });
      });

      const rows = contentEl.querySelectorAll('tbody tr');
      rows.forEach(tr => {
        tr.addEventListener('click', () => {
          rows.forEach(r => r.classList.remove('erp-row-highlighted'));
          tr.classList.add('erp-row-highlighted');
        });
      });
    }

    searchInput?.addEventListener('input', applyFilterAndSort);

    sortDropdown?.addEventListener('change', (e) => {
      const parts = e.target.value.split('_');
      currentSortField = parts[0];
      currentSortOrder = parts[1] || 'asc';
      applyFilterAndSort();
    });

    refreshBtn?.addEventListener('click', () => {
      loadFeeForClass(activeClass);
    });

    if (classDropdown) {
      classDropdown.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        const clsId = e.target.value;
        const clsName = opt.dataset.name;
        const clsDisplay = opt.dataset.display;
        loadFeeForClass({ id: clsId, name: clsName, display: clsDisplay });
      });
    }

    loadFeeForClass(activeClass);
  };

  // Immediate check if report or fee view was already requested or visible:
  if (app.pendingReportInit || window.location.hash === '#report' || (app.root && !app.root.querySelector('#erp-report-view')?.hidden)) {
    const rv = document.getElementById('erp-report-view');
    if (rv) app.initReportView(rv);
  }
  if (app.pendingFeeInit || window.location.hash === '#fee' || (app.root && !app.root.querySelector('#erp-fee-view')?.hidden)) {
    const fv = document.getElementById('erp-fee-view');
    if (fv) app.initFeeView(fv);
  }
})();
