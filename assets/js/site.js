(() => {
  const app = document.querySelector('#app');
  const SUPPORTED = ['tr', 'en', 'de'];
  const qs = new URLSearchParams(location.search);

  let lang = SUPPORTED.includes(qs.get('lang'))
    ? qs.get('lang')
    : (localStorage.getItem('siteLang') || 'tr');

  const page = document.body.dataset.page || 'home';

  const esc = (value = '') =>
    String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    }[char]));

  const empty = data =>
    `<p class="placeholder">${esc(data.labels?.emptySection || '—')}</p>`;

  const makeUrl = (file, params = {}) => {
    const search = new URLSearchParams({ lang, ...params });
    return `${file}?${search.toString()}`;
  };

  const pageHeading = (data, p) => `
    <div class="eyebrow">${esc(data.labels?.websiteSection || '')}</div>
    <h1 class="page-title">${esc(p?.title || '')}</h1>
  `;

  loadContent()
    .then(render)
    .catch(showError);

  async function loadContent() {
    try {
      return await fetchJson(lang);
    } catch (error) {
      if (lang === 'tr') throw error;

      lang = 'tr';
      localStorage.setItem('siteLang', lang);
      document.documentElement.lang = lang;

      const next = new URL(location.href);
      next.searchParams.set('lang', lang);
      history.replaceState(null, '', next);

      return fetchJson(lang);
    }
  }

  async function fetchJson(code) {
    const path = `content/${code}.json?v=${Date.now()}`;
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`${path} yüklenemedi.`);
    }

    const data = await response.json();
    localStorage.setItem('siteLang', code);
    document.documentElement.lang = code;
    return data;
  }

  function showError(error) {
    console.error(error);

    app.innerHTML = `
      <main class="page-wrap">
        <div class="content-card error-card">
          <div class="eyebrow">HATA</div>
          <h1 class="page-title">İçerik yüklenemedi</h1>
          <p>${esc(error.message)}</p>
          <p>Siteyi Live Server üzerinden açtığından ve <code>content/tr.json</code> dosyasının bulunduğundan emin ol.</p>
        </div>
      </main>
    `;
  }

  function render(data) {
    document.title = buildDocumentTitle(data);

    app.innerHTML = `
      ${header(data)}
      <main class="page-wrap">
        <div class="page-grid">
          ${profileCard(data)}
          <article class="content-card">
            ${pageContent(data)}
          </article>
        </div>
      </main>
      ${footer(data)}
    `;

    bindUI(data);
  }

  function buildDocumentTitle(data) {
    const siteName = data.profile?.name || 'Portfolio';
    const id = qs.get('id');

    if (page === 'course') {
      const project = (data.pages?.courses?.items || []).find(x => x.id === id);
      return `${project?.code || project?.title || 'Proje'} · ${siteName}`;
    }

    if (page === 'portfolio-item') {
      const item = (data.pages?.about?.items || []).find(x => x.id === id);
      return `${item?.title || 'Teknik Portfolyo'} · ${siteName}`;
    }

    return `${data.pages?.[page]?.title || siteName} · ${siteName}`;
  }

  function header(data) {
    const projects = data.pages?.courses?.items || [];

    const projectLinks = projects.map(project => `
      <a href="${makeUrl('proje.html', { id: project.id })}">
        ${esc(project.code || project.title || data.labels?.course || 'Proje')}
      </a>
    `).join('');

    const languageLinks = SUPPORTED.map(code => {
      const next = new URL(location.href);
      next.searchParams.set('lang', code);

      return `
        <a
          href="${next.pathname.split('/').pop() || 'index.html'}${next.search}"
          class="${code === lang ? 'active' : ''}"
          aria-label="${code.toUpperCase()}"
        >
          ${code.toUpperCase()}
        </a>
      `;
    }).join('');

    const navLinks = (data.navigation || []).map(item => {
      if (item.key === 'courses') {
        const active = page === 'courses' || page === 'course' ? 'active' : '';

        return `
          <div class="nav-item">
            <button class="nav-button ${active}" type="button" data-submenu-toggle>
              ${esc(item.label)} ▾
            </button>

            <div class="submenu">
              <a href="${makeUrl('projeler.html')}">
                ${esc(data.pages?.courses?.title || 'Projeler')}
              </a>
              ${projectLinks}
            </div>
          </div>
        `;
      }

      const active =
        item.page === page ||
        (item.page === 'about' && page === 'portfolio-item');

      return `
        <a
          class="nav-link ${active ? 'active' : ''}"
          href="${makeUrl(item.file)}"
        >
          ${esc(item.label)}
        </a>
      `;
    }).join('');

    return `
      <header class="site-header">
        <div class="header-inner">
          <div class="identity">
            <h1>${esc(data.profile?.name || data.labels?.namePlaceholder || '')}</h1>

            <div class="identity-meta">
              ${[
                data.profile?.title,
                data.profile?.institution,
                data.profile?.department,
                data.profile?.location
              ]
                .filter(Boolean)
                .map(value => `<div>${esc(value)}</div>`)
                .join('')}
            </div>
          </div>

          <div class="top-tools">
            <div class="lang-switch">${languageLinks}</div>
          </div>
        </div>

        <div class="main-nav-wrap">
          <nav class="main-nav" id="mainNav">
            <button class="nav-button menu-toggle" id="menuToggle" type="button">
              ☰ ${esc(data.labels?.menu || 'Menü')}
            </button>
            ${navLinks}
          </nav>
        </div>
      </header>
    `;
  }

  function profileCard(data) {
    const p = data.profile || {};

    const links = (p.links || [])
      .filter(item => item.label || item.url)
      .map(item => `
        <a
          href="${esc(item.url || '#')}"
          ${item.url?.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}
        >
          ${esc(item.label || item.url)}
        </a>
      `)
      .join('');

    return `
      <aside class="profile-card">
        <img
          class="profile-photo"
          src="${esc(p.photo || 'assets/img/profile-placeholder.svg')}"
          alt="${esc(p.name || '')}"
          onerror="this.onerror=null;this.src='assets/img/profile-placeholder.svg';"
        >

        <div>
          <h2>${esc(p.name || '')}</h2>
          ${p.shortBio ? `<p>${esc(p.shortBio)}</p>` : ''}
          ${links ? `<div class="mini-links">${links}</div>` : ''}
        </div>
      </aside>
    `;
  }

  function pageContent(data) {
    switch (page) {
      case 'home':
        return renderHome(data, data.pages.home);

      case 'courses':
        return renderCourses(data, data.pages.courses);

      case 'course':
        return renderCourse(data);

      case 'about':
        return renderPortfolio(data, data.pages.about);

      case 'portfolio-item':
        return renderPortfolioItem(data);

      case 'research':
        return renderCardsPage(data, data.pages.research);

      case 'news':
        return renderCardsPage(data, data.pages.news);

      case 'publications':
        return renderPublications(data, data.pages.publications);

      case 'calendar':
        return renderCalendar(data, data.pages.calendar);

      case 'contact':
        return renderContact(data, data.pages.contact);

      default:
        return pageHeading(data, data.pages.home);
    }
  }

  function renderHome(data, p) {
  const education = (p.education || []).map(item => `
    <li class="education-item">
      <strong class="education-degree">
        ${esc(item.degree || '')}
      </strong>

      ${item.school ? `
        <span class="education-school">
          ${esc(item.school)}
        </span>
      ` : ''}

      ${item.year ? `
        <span class="education-year">
          ${esc(item.year)}
        </span>
      ` : ''}
    </li>
  `).join('');

    const interests = (p.researchInterests || [])
      .map(item => `<li>${esc(item)}</li>`)
      .join('');

    return `
      ${pageHeading(data, p)}

      <section class="section">
        <div class="two-col">
          <div>
            <h2>${esc(p.educationTitle || '')}</h2>
            ${education ? `<ul class="clean-list">${education}</ul>` : empty(data)}
          </div>

          <div>
            <h2>${esc(p.cvTitle || '')}</h2>
            ${p.cvText ? `<p>${esc(p.cvText)}</p>` : empty(data)}

            ${p.cvUrl ? `
              <a class="btn secondary" href="${esc(p.cvUrl)}" target="_blank" rel="noopener">
                ${esc(p.cvButton || 'CV')}
              </a>
            ` : ''}
          </div>
        </div>
      </section>

      <section class="section">
        <h2>${esc(p.interestsTitle || '')}</h2>
        ${interests ? `<ul class="clean-list">${interests}</ul>` : empty(data)}
      </section>

      <section class="section">
        <h2>${esc(p.latestResearchTitle || '')}</h2>
        ${cards(p.latestResearch || [], data.labels) || empty(data)}
      </section>

      <section class="section">
        <h2>${esc(p.eventsTitle || '')}</h2>
        ${cards(p.upcomingEvents || [], data.labels) || empty(data)}
      </section>
    `;
  }

  function renderCardsPage(data, p) {
    return `
      ${pageHeading(data, p)}

      ${p.intro ? `
        <section class="section">
          <p>${esc(p.intro)}</p>
        </section>
      ` : ''}

      <section class="section">
        ${cards(p.items || [], data.labels) || empty(data)}
      </section>
    `;
  }

  function cards(items, labels = {}) {
    if (!items.length) return '';

    return `
      <div class="card-grid">
        ${items.map(item => `
          <article class="item-card">
            <img
              src="${esc(item.image || 'assets/img/project-placeholder.svg')}"
              alt="${esc(item.title || '')}"
              onerror="this.onerror=null;this.src='assets/img/project-placeholder.svg';"
            >

            <div class="item-card-body">
              <h3>${esc(item.title || labels.itemTitle || '')}</h3>

              ${item.date ? `
                <div class="eyebrow">${esc(item.date)}</div>
              ` : ''}

              ${item.description ? `<p>${esc(item.description)}</p>` : ''}

              ${item.url ? `
                <a href="${esc(item.url)}" target="_blank" rel="noopener">
                  ${esc(item.linkLabel || labels.details || 'Detaylar')}
                </a>
              ` : ''}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderCourses(data, p) {
    const projects = p.items || [];

    const rows = projects.map(project => `
      <a class="course-row course-row-link" href="${makeUrl('proje.html', { id: project.id })}">
        <div>
          <h3>${esc(project.code || project.title || '')}</h3>
          ${project.title ? `
            <div class="identity-meta">${esc(project.title)}</div>
          ` : ''}
        </div>

        <span class="detail-arrow">${esc(data.labels?.details || 'Detaylar')} →</span>
      </a>
    `).join('');

    return `
      ${pageHeading(data, p)}

      ${p.intro ? `
        <section class="section">
          <p>${esc(p.intro)}</p>
        </section>
      ` : ''}

      <section class="section">
        <div class="course-list">
          ${rows || empty(data)}
        </div>
      </section>
    `;
  }

  function renderCourse(data) {
    const id = qs.get('id');
    const project = (data.pages?.courses?.items || []).find(item => item.id === id);

    if (!project) {
      return notFound(
        data,
        data.pages?.courses?.title || 'Projeler',
        'Proje bulunamadı',
        makeUrl('projeler.html'),
        'Projeler'
      );
    }

    const materials = (project.materials || [])
      .map(item => typeof item === 'string' ? { label: item, url: '' } : item)
      .filter(item => item && (item.label || item.url))
      .map(item => `
        <li>
          ${item.url
            ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.label || item.url)}</a>`
            : esc(item.label || '')}
        </li>
      `)
      .join('');

    return `
      <div class="eyebrow">${esc(data.pages?.courses?.title || 'Projeler')}</div>
      <h1 class="page-title">${esc(project.code || project.title || 'Proje')}</h1>

      <section class="section">
        <h2>${esc(project.title || data.labels?.courseTitle || '')}</h2>
        ${project.description ? `<p>${esc(project.description)}</p>` : empty(data)}
      </section>

      ${materials ? `
        <section class="section">
          <h2>${esc(data.labels?.courseMaterials || 'Dosyalar / Kaynaklar')}</h2>
          <ul class="clean-list">${materials}</ul>
        </section>
      ` : ''}

      ${project.announcementsHtml ? `
        <section class="section">
          <h2>${esc(data.labels?.announcements || 'Teknik Notlar')}</h2>
          ${project.announcementsHtml}
        </section>
      ` : ''}

      <section class="section section-actions">
        <a class="back-link" href="${makeUrl('projeler.html')}">← Projelere dön</a>
      </section>
    `;
  }

  function renderPortfolio(data, p) {
    const items = (p.items || []).map(item => `
      <a
        class="portfolio-card"
        href="${makeUrl('portfolio-item.html', { id: item.id })}"
      >
        <img
          src="${esc(item.image || 'assets/img/project-placeholder.svg')}"
          alt="${esc(item.title || '')}"
          onerror="this.onerror=null;this.src='assets/img/project-placeholder.svg';"
        >

        <div class="portfolio-card-body">
          ${item.project ? `<div class="eyebrow">${esc(item.project)}</div>` : ''}
          <h2>${esc(item.title || data.labels?.itemTitle || '')}</h2>
          ${item.description ? `<p>${esc(item.description)}</p>` : ''}
          <span class="portfolio-detail-link">
            ${esc(data.labels?.details || 'Detaylar')} →
          </span>
        </div>
      </a>
    `).join('');

    return `
      ${pageHeading(data, p)}

      ${p.intro ? `
        <section class="section">
          <p>${esc(p.intro)}</p>
        </section>
      ` : ''}

      <section class="section">
        ${items
          ? `<div class="portfolio-grid">${items}</div>`
          : empty(data)}
      </section>
    `;
  }

  function renderPortfolioItem(data) {
    const id = qs.get('id');
    const item = (data.pages?.about?.items || []).find(entry => entry.id === id);

    if (!item) {
      return notFound(
        data,
        data.labels?.portfolio || 'Teknik Portfolyo',
        'Portfolyo öğesi bulunamadı',
        makeUrl('deneyim.html'),
        data.labels?.portfolioBack || 'Portfolyoya dön'
      );
    }

    const boundaries = (item.boundaryConditions || [])
      .map(value => `<li>${esc(value)}</li>`)
      .join('');

    const tools = (item.tools || [])
      .map(value => `<li>${esc(value)}</li>`)
      .join('');

    return `
      <div class="eyebrow">${esc(item.project || data.labels?.portfolio || '')}</div>
      <h1 class="page-title">${esc(item.title || '')}</h1>

      ${item.date ? `<div class="portfolio-meta">${esc(item.date)}</div>` : ''}

      <section class="section portfolio-image-section">
        <img
          class="portfolio-detail-image"
          src="${esc(item.image || 'assets/img/project-placeholder.svg')}"
          alt="${esc(item.title || '')}"
          onerror="this.onerror=null;this.src='assets/img/project-placeholder.svg';"
        >
      </section>

      ${item.description ? `
        <section class="section">
          <p class="portfolio-intro">${esc(item.description)}</p>
        </section>
      ` : ''}

      ${item.purpose ? `
        <section class="section">
          <h2>${esc(data.labels?.portfolioPurpose || 'Parçanın Amacı')}</h2>
          <p>${esc(item.purpose)}</p>
        </section>
      ` : ''}

      ${boundaries ? `
        <section class="section">
          <h2>${esc(data.labels?.portfolioBoundaryConditions || 'Sınır Koşulları')}</h2>
          <ul class="clean-list">${boundaries}</ul>
        </section>
      ` : ''}

      ${item.designProcess ? `
        <section class="section">
          <h2>${esc(data.labels?.portfolioDesignProcess || 'Nasıl Elde Edildi?')}</h2>
          <p>${esc(item.designProcess)}</p>
        </section>
      ` : ''}

      ${item.manufacturing ? `
        <section class="section">
          <h2>${esc(data.labels?.portfolioManufacturing || 'Nasıl Üretilecek?')}</h2>
          <p>${esc(item.manufacturing)}</p>
        </section>
      ` : ''}

      ${tools ? `
        <section class="section">
          <h2>${esc(data.labels?.portfolioTools || 'Kullanılan Araçlar')}</h2>
          <ul class="clean-list">${tools}</ul>
        </section>
      ` : ''}

      <section class="section section-actions">
        <a class="back-link" href="${makeUrl('deneyim.html')}">
          ← ${esc(data.labels?.portfolioBack || 'Portfolyoya dön')}
        </a>
      </section>
    `;
  }

  function notFound(data, eyebrow, title, href, label) {
    return `
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h1 class="page-title">${esc(title)}</h1>

      <section class="section">
        <p class="placeholder">
          URL'deki içerik kimliği JSON dosyasındaki bir öğeyle eşleşmiyor.
        </p>
      </section>

      <section class="section section-actions">
        <a class="back-link" href="${href}">← ${esc(label)}</a>
      </section>
    `;
  }

  function renderPublications(data, p) {
    const group = (title, list = []) => `
      <div class="publication-group">
        <h2>${esc(title || '')}</h2>

        ${list.length ? `
          <ol class="publication-list">
            ${list.map(item => `
              <li>
                ${esc(item.citation || '')}
                ${item.url ? `
                  <a href="${esc(item.url)}" target="_blank" rel="noopener">
                    [${esc(item.linkLabel || 'link')}]
                  </a>
                ` : ''}
              </li>
            `).join('')}
          </ol>
        ` : empty(data)}
      </div>
    `;

    return `
      ${pageHeading(data, p)}

      <section class="section">
        ${group(p.journalTitle, p.journal)}
        ${group(p.conferenceTitle, p.conference)}
        ${group(p.otherTitle, p.other)}
      </section>
    `;
  }

  function renderCalendar(data, p) {
    return `
      ${pageHeading(data, p)}

      <section class="section">
        ${p.embedUrl ? `
          <iframe
            class="calendar-frame"
            src="${esc(p.embedUrl)}"
            loading="lazy"
            title="${esc(p.title || 'Takvim')}"
          ></iframe>
        ` : `
          <p class="placeholder">${esc(data.labels?.calendarHint || data.labels?.emptySection || '—')}</p>
        `}
      </section>
    `;
  }

  function renderContact(data, p) {
    const emails = p.emails?.length
      ? p.emails
      : (p.email ? [p.email] : []);

    return `
      ${pageHeading(data, p)}

      <section class="section">
        <div class="contact-grid">
          <div>
            <h2>${esc(p.infoTitle || '')}</h2>

            <p>
              <strong>${esc(data.profile?.name || '')}</strong><br>
              ${esc(data.profile?.institution || '')}
            </p>

            ${emails.length ? `
              <p>
                ${emails.map(email => `
                  <a href="mailto:${esc(email)}">${esc(email)}</a>
                `).join('<br>')}
              </p>
            ` : ''}

            ${p.phone ? `<p>${esc(p.phone)}</p>` : ''}
            ${p.address ? `<p>${esc(p.address)}</p>` : ''}
          </div>

          <div>
            <h2>${esc(p.formTitle || '')}</h2>

            <form class="contact-form" id="contactForm">
              <div class="field">
                <label>${esc(data.labels?.formName || 'Ad Soyad')}</label>
                <input name="name" required>
              </div>

              <div class="field">
                <label>${esc(data.labels?.formEmail || 'E-posta')}</label>
                <input type="email" name="email" required>
              </div>

              <div class="field">
                <label>${esc(data.labels?.formSubject || 'Konu')}</label>
                <input name="subject">
              </div>

              <div class="field">
                <label>${esc(data.labels?.formMessage || 'Mesaj')}</label>
                <textarea name="message" required></textarea>
              </div>

              <button class="btn" type="submit">
                ${esc(data.labels?.send || 'Gönder')}
              </button>

              <div class="form-note" id="formNote">
                ${esc(data.labels?.formSetupHint || '')}
              </div>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  function footer(data) {
    return `
      <footer class="site-footer">
        <div class="footer-inner">
          <div>${esc(data.footer?.left || '')}</div>
          <div>${esc(data.footer?.right || '')}</div>
        </div>
      </footer>
    `;
  }

  function bindUI(data) {
    const nav = document.querySelector('#mainNav');
    const menu = document.querySelector('#menuToggle');

    if (menu && nav) {
      if (innerWidth <= 900) {
        nav.classList.add('collapsed');
      }

      menu.addEventListener('click', () => {
        nav.classList.toggle('collapsed');
      });
    }

    document.querySelectorAll('[data-submenu-toggle]').forEach(button => {
      button.addEventListener('click', event => {
        if (innerWidth <= 900) {
          event.currentTarget.parentElement.classList.toggle('open');
        }
      });
    });

    const form = document.querySelector('#contactForm');
    if (!form) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const note = document.querySelector('#formNote');
      const endpoint = data.pages?.contact?.formEndpoint;

      if (!endpoint) {
        note.textContent =
          data.labels?.formNotConfigured ||
          'İletişim formu henüz yapılandırılmadı.';
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) throw new Error('send failed');

        form.reset();
        note.textContent = data.labels?.formSuccess || 'Mesaj gönderildi.';
      } catch {
        note.textContent = data.labels?.formError || 'Mesaj gönderilemedi.';
      }
    });
  }
})();
