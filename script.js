function renderGallery() {
  const gallery = document.getElementById('detailGallery');
  if (!gallery || !window.galleryData) return;
  const visibleCount = new Map();
  const groupCache = new WeakMap();
  const naturalSorter = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const INITIAL_ITEMS = 9;
  const LOAD_MORE_STEP = 9;

  function sortByPathNumber(a, b) {
    return naturalSorter.compare(a.src || a.title || '', b.src || b.title || '');
  }

  function sortedGroups(module) {
    if (groupCache.has(module)) return groupCache.get(module);
    const groups = [...module.groups]
      .sort((a, b) => {
        const aIsHeavy = /ai\s*video|video/i.test(a.title) || a.items.some((item) => item.type === 'video');
        const bIsHeavy = /ai\s*video|video/i.test(b.title) || b.items.some((item) => item.type === 'video');
        if (aIsHeavy !== bIsHeavy) return aIsHeavy ? 1 : -1;
        return naturalSorter.compare(a.title, b.title);
      })
      .map((group) => ({
        ...group,
        items: [...group.items].sort(sortByPathNumber)
      }));
    groupCache.set(module, groups);
    return groups;
  }

  function countItems(module) {
    return module.groups.reduce((total, group) => total + group.items.length, 0);
  }

  function coverFor(module) {
    if (module.title === 'RAILIA Visual') {
      return 'railia-visual/2-website-banners/1.png';
    }
    if (module.title === 'BY-HEALTH') {
      return 'optimized-assets/by-health/1-KV/kv.jpg';
    }
    const firstGroup = module.groups.find((group) => group.items.length);
    const firstImage = firstGroup && firstGroup.items.find((item) => item.type === 'image');
    const firstItem = firstImage || (firstGroup && firstGroup.items[0]);
    return firstItem ? firstItem.src : '';
  }

  function renderMediaCard(item, label) {
    return `
      <a class="detail-card ${item.type === 'video' ? 'is-video' : ''}" href="${item.src}" data-type="${item.type}">
        ${item.type === 'video'
          ? `<video src="${item.src}" muted playsinline preload="metadata"></video>`
          : `<img src="${item.src}" alt="${item.title}" loading="lazy" decoding="async">`}
        <span>${label || item.title}</span>
      </a>
    `;
  }

  function groupKey(moduleTitle, groupTitle) {
    return `${moduleTitle}::${groupTitle}`;
  }

  function renderWaterfall(items, labelPrefix, key) {
    const safeItems = items.filter(Boolean);
    if (!safeItems.length) return '';
    const count = Math.min(visibleCount.get(key) || INITIAL_ITEMS, safeItems.length);
    const visibleItems = safeItems.slice(0, count);

    return `
      <div class="detail-waterfall" data-group-key="${key}" data-total="${safeItems.length}">
        ${visibleItems.map((item) => renderMediaCard(item, `${labelPrefix} / ${item.title}`)).join('')}
      </div>
      ${count < safeItems.length ? `
        <button class="load-more" type="button" data-load-more="${key}" data-total="${safeItems.length}">
          Load more
        </button>
      ` : ''}
    `;
  }

  function runWhenIdle(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 800 });
    } else {
      window.setTimeout(callback, 32);
    }
  }

  function setupVideoPosters(root = gallery) {
    root.querySelectorAll('.detail-card video:not([data-poster-ready])').forEach((video) => {
      video.dataset.posterReady = 'pending';
      const seekPreviewFrame = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        video.currentTime = Math.min(0.15, Math.max(video.duration - 0.05, 0));
      };
      video.addEventListener('loadedmetadata', seekPreviewFrame, { once: true });
      video.addEventListener('seeked', () => {
        video.dataset.posterReady = 'true';
      }, { once: true });
      if (video.readyState >= 1) seekPreviewFrame();
    });
  }

  function renderRailiaUiCase(module) {
    const groups = sortedGroups(module);
    const homeGroup = groups[0] || { items: [] };
    const functionGroup = groups[1] || { items: [] };
    const home = homeGroup.items.find((item) => item.src.includes('/home.png')) || homeGroup.items[0];
    const homeMobile = homeGroup.items.find((item) => item.src.includes('home-mobile'));
    const detail = homeGroup.items.find((item) => item.src.includes('detail-pages.png'));
    const detailMobile = homeGroup.items.find((item) => item.src.includes('detail-pages-mobile'));
    const commerceItems = functionGroup.items.filter((item) => /cart|order|payment|address|after-sales/i.test(item.src));
    const serviceItems = functionGroup.items.filter((item) => /about|contact|news|service|questionnaire|railia/i.test(item.src));

    if (module.title !== 'RAILIA UI') return '';
    return `
      <div class="railia-case">
        <section class="railia-case-hero">
          <div class="railia-case-copy">
            <p class="case-kicker">RAILIA UI / AI Beauty Tech</p>
            <h3>Responsive Website Experience for an AI LED Skincare Device</h3>
            <p>RAILIA's website system introduces a beauty-tech product, supports shopping decisions, and completes overseas commerce flows through a premium, clean, technology-driven interface.</p>
          </div>
          <div class="railia-case-visual">
            ${home ? renderMediaCard(home, 'Homepage Experience') : ''}
            ${homeMobile ? renderMediaCard(homeMobile, 'Mobile Homepage') : ''}
          </div>
        </section>

        <section class="railia-case-strip">
          <div>
            <span>Role</span>
            <strong>UI / UX Design</strong>
          </div>
          <div>
            <span>Platform</span>
            <strong>Responsive Web</strong>
          </div>
          <div>
            <span>Experience</span>
            <strong>Product, Commerce, Service</strong>
          </div>
          <div>
            <span>Visual Tone</span>
            <strong>Clinical, Premium, AI-Tech</strong>
          </div>
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>01 / Product Story</span>
            <h4>Turn device value into a clear product narrative.</h4>
            <p>The homepage and detail pages focus on product benefits, technology cues, device imagery and conversion paths, helping users understand RAILIA before entering purchase flows.</p>
          </div>
          ${renderWaterfall([detail, detailMobile], 'Product Story', groupKey(module.title, 'Product Story'))}
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>02 / Commerce Flow</span>
            <h4>Build purchase confidence across account, cart and order states.</h4>
            <p>Functional pages cover login, cart, overseas payment, order details, address management and after-sales scenarios so the product website can support a complete buying journey.</p>
          </div>
          ${renderWaterfall(commerceItems, 'Commerce Flow', groupKey(module.title, 'Commerce Flow'))}
        </section>

        <section class="railia-case-section">
          <div class="railia-section-copy">
            <span>03 / Brand Support</span>
            <h4>Extend trust through service, brand and content pages.</h4>
            <p>Support pages, about pages, news and questionnaire flows create the service layer behind the device, balancing brand credibility with practical user assistance.</p>
          </div>
          ${renderWaterfall(serviceItems, 'Brand Support', groupKey(module.title, 'Brand Support'))}
        </section>
      </div>
    `;
  }

  function renderModuleContent(module) {
    const groups = sortedGroups(module);
    if (module.title === 'RAILIA UI') {
      return `
        <div class="module-panel">
          ${renderRailiaUiCase(module)}
        </div>
      `;
    }

    return `
      <div class="module-panel">
        ${groups.map((group) => `
          <section class="detail-group">
            <header class="detail-head">
              <h4>${group.title}</h4>
              <p>${group.items.length} items</p>
            </header>
            ${renderWaterfall(group.items, group.title, groupKey(module.title, group.title))}
          </section>
        `).join('')}
      </div>
    `;
  }

  function renderEntry() {
    gallery.innerHTML = `
      <div class="module-accordion">
        ${window.galleryData.map((module, index) => {
          return `
            <article class="module-accordion-item">
              <button class="module-entry" type="button" data-module-index="${index}" aria-expanded="false">
                ${coverFor(module) ? `<img src="${coverFor(module)}" alt="" loading="lazy">` : ''}
                <span class="module-entry-index">${String(index + 1).padStart(2, '0')}</span>
                <strong>${module.title}</strong>
                <small>${module.groups.length} sections / ${countItems(module)} works</small>
                <b>Open</b>
              </button>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  gallery.addEventListener('click', (event) => {
    const entry = event.target.closest('.module-entry');
    if (entry) {
      const index = Number(entry.dataset.moduleIndex);
      const article = entry.closest('.module-accordion-item');
      const panel = article.querySelector(':scope > .module-panel');
      const label = entry.querySelector('b');

      if (panel) {
        const oldPanel = panel;
        panel.remove();
        article.classList.remove('is-open');
        entry.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = 'Open';
        runWhenIdle(() => {
          oldPanel.querySelectorAll('video').forEach((video) => {
            video.pause();
            video.removeAttribute('src');
            video.load();
          });
          oldPanel.querySelectorAll('img').forEach((image) => {
            image.removeAttribute('src');
          });
        });
      } else {
        article.classList.add('is-open');
        entry.setAttribute('aria-expanded', 'true');
        if (label) label.textContent = 'Close';
        article.insertAdjacentHTML('beforeend', '<div class="module-panel module-panel-loading" aria-live="polite">Loading case preview</div>');
        const loadingPanel = article.querySelector(':scope > .module-panel-loading');
        runWhenIdle(() => {
          if (!article.classList.contains('is-open') || !loadingPanel || !loadingPanel.isConnected) return;
          const wrapper = document.createElement('div');
          wrapper.innerHTML = renderModuleContent(window.galleryData[index]);
          const panel = wrapper.firstElementChild;
          loadingPanel.replaceWith(panel);
          setupVideoPosters(panel);
        });
      }
      entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const loadMore = event.target.closest('[data-load-more]');
    if (loadMore) {
      const key = loadMore.dataset.loadMore;
      const total = Number(loadMore.dataset.total);
      const current = visibleCount.get(key) || INITIAL_ITEMS;
      visibleCount.set(key, Math.min(current + LOAD_MORE_STEP, total));
      const panel = loadMore.closest('.module-panel');
      const article = loadMore.closest('.module-accordion-item');
      const moduleIndex = Number(article.querySelector('.module-entry').dataset.moduleIndex);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderModuleContent(window.galleryData[moduleIndex]);
      panel.replaceWith(wrapper.firstElementChild);
      setupVideoPosters(wrapper.firstElementChild);
    }
  });

  renderEntry();
  setupVideoPosters();
}

function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const stage = lightbox.querySelector('.lightbox-stage');
  let lbVideo = lightbox.querySelector('.lightbox-video');
  let lastFocused = null;

  if (!lbVideo) {
    lbVideo = document.createElement('video');
    lbVideo.className = 'lightbox-video';
    lbVideo.controls = true;
    lbVideo.playsInline = true;
    stage.insertBefore(lbVideo, lbCaption);
  }

  function open(src, caption, alt, type) {
    lastFocused = document.activeElement;
    lbImg.hidden = type === 'video';
    lbVideo.hidden = type !== 'video';
    if (type === 'video') {
      lbVideo.src = src;
      lbImg.src = '';
    } else {
      lbImg.src = src;
      lbImg.alt = alt || caption || '';
      lbVideo.pause();
      lbVideo.removeAttribute('src');
    }
    lbCaption.textContent = caption || '';
    stage.scrollTop = 0;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lightbox-close').focus();
  }

  function close() {
    lightbox.hidden = true;
    lbImg.src = '';
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', (event) => {
    if (Date.now() < (window.__portfolioSuppressLightboxUntil || 0)) {
      event.preventDefault();
      return;
    }
    const card = event.target.closest('.detail-card');
    if (!card) return;
    event.preventDefault();
    const media = card.querySelector('img, video');
    const label = card.querySelector('span');
    open(card.getAttribute('href'), label ? label.textContent : '', media ? media.alt : '', card.dataset.type);
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target === stage) close();
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !lightbox.hidden) close();
  });
}

function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function reveal(el, delay = 0) {
    if (!el) return;
    el.classList.add('reveal');
    if (delay) el.style.setProperty('--reveal-delay', `${delay}s`);
    io.observe(el);
  }

  document.querySelectorAll('.about .portrait-wrap, .about-copy, .skills h2, .selected-hero, .work-intro, .skills-mark, .contact-mark')
    .forEach((el) => reveal(el));

  function stagger(containerSelector, itemSelector, step, cap = 99) {
    document.querySelectorAll(containerSelector).forEach((container) => {
      container.querySelectorAll(itemSelector).forEach((el, index) => {
        reveal(el, Math.min(index, cap) * step);
      });
    });
  }

  stagger('.jobs', 'li', 0.1);
  stagger('.contact dl', 'div', 0.08);
  document.querySelectorAll('.detail-group').forEach((group) => reveal(group.querySelector('.detail-head')));
  stagger('.detail-waterfall', '.detail-card', 0.035, 16);
}

function setupScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const ratio = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function setupBackToTop() {
  const btn = document.getElementById('toTop');
  if (!btn) return;
  let ticking = false;
  const update = () => {
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  update();
}

function setupSkillsReveal() {
  const skills = document.querySelector('.skills');
  if (!skills || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  skills.querySelectorAll('li').forEach((li, index) => {
    li.style.transitionDelay = `${Math.min(index, 12) * 0.06}s`;
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  io.observe(skills);
}

function setupHeroParallax() {
  const stage = document.querySelector('.hero-stage');
  if (!stage) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const layers = [
    { el: document.querySelector('.hero-device'), depth: 14 },
    { el: document.querySelector('.hero-float-left'), depth: 26 },
    { el: document.querySelector('.hero-float-right'), depth: 32 },
    { el: document.querySelector('.hero-headline'), depth: 10 }
  ].filter((layer) => layer.el);

  let raf = 0;
  let targetX = 0;
  let targetY = 0;

  const apply = () => {
    layers.forEach(({ el, depth }) => {
      el.style.translate = `${targetX * depth}px ${targetY * depth}px`;
    });
    raf = 0;
  };

  stage.addEventListener('mousemove', (event) => {
    const rect = stage.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (!raf) raf = window.requestAnimationFrame(apply);
  });
  stage.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
    if (!raf) raf = window.requestAnimationFrame(apply);
  });
}

function setupCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let raf = 0;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  const apply = () => {
    glow.style.transform = `translate(${x}px, ${y}px)`;
    raf = 0;
  };

  document.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    glow.classList.add('is-active');
    if (!raf) raf = window.requestAnimationFrame(apply);
  }, { passive: true });
  document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
}

function setupCountUp() {
  const targets = document.querySelectorAll('[data-count]');
  if (!targets.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      const end = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1100;
      let start = 0;
      const step = (now) => {
        if (!start) start = now;
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * end) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  targets.forEach((el) => io.observe(el));
}

function setupMagnetic() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.to-top').forEach((el) => {
    el.addEventListener('mousemove', (event) => {
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left - rect.width / 2;
      const my = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${mx * 0.3}px, ${my * 0.3}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

renderGallery();
setupLightbox();
setupReveal();
setupScrollProgress();
setupBackToTop();
setupSkillsReveal();
setupHeroParallax();
setupCursorGlow();
setupCountUp();
setupMagnetic();

