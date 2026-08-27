(() => {
  const SUPPORTED = ['tr', 'en', 'de'];
  const qs = new URLSearchParams(location.search);
  const lang = SUPPORTED.includes(qs.get('lang'))
    ? qs.get('lang')
    : (localStorage.getItem('siteLang') || 'tr');

  localStorage.setItem('siteLang', lang);
  document.documentElement.lang = lang;

  const page = document.body.dataset.page || 'home';
  const contentPath = `content/${lang}.json`;

  const esc = (v='') =>
    String(v).replace(/[&<>'"]/g, s => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#039;',
      '"':'&quot;'
    }[s]));

  const placeholder = (v, fallback) =>
    v
      ? esc(v)
      : `<span class="placeholder">${esc(fallback || '—')}</span>`;

  const urlFor = (file) => `${file}?lang=${lang}`;

  fetch(contentPath)
    .then(r => {
      if (!r.ok) {
        throw new Error(`Content file not found: ${contentPath}`);
      }
      return r.json();
    })
    .then(data => render(data))
    .catch(err => {
      document.querySelector('#app').innerHTML = `
        <div class="page-wrap">
          <div class="content-card">
            <h1>Content error</h1>
            <p>${esc(err.message)}</p>
          </div>
        </div>
      `;
      console.error(err);
    });


  function render(data) {
    document.title =
      `${data.profile.name || data.labels.namePlaceholder} · ${data.pages[page]?.title || ''}`;

    document.querySelector('#app').innerHTML = `
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


  function header(data) {
    const nav = data.navigation;

    const courseLinks = (data.pages.courses.items || []).map(c => `
      <a href="proje.html?lang=${lang}&id=${encodeURIComponent(c.id)}">
        ${esc(c.code || c.title || data.labels.course)}
      </a>
    `).join('');


    const languageLink = code => {
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
    };


    return `
      <header class="site-header">

        <div class="header-inner">

          <div class="identity">

            <h1>
              ${placeholder(
                data.profile.name,
                data.labels.namePlaceholder
              )}
            </h1>

            <div class="identity-meta">

              <div>
                ${placeholder(
                  data.profile.title,
                  data.labels.titlePlaceholder
                )}
              </div>

              <div>
                ${placeholder(
                  data.profile.institution,
                  data.labels.institutionPlaceholder
                )}
              </div>

              <div>
                ${placeholder(
                  data.profile.department,
                  data.labels.departmentPlaceholder
                )}
              </div>

              <div>
                ${placeholder(
                  data.profile.location,
                  data.labels.locationPlaceholder
                )}
              </div>

            </div>

          </div>


          <div class="top-tools">
            <div class="lang-switch">
              ${SUPPORTED.map(languageLink).join('')}
            </div>
          </div>

        </div>


        <div class="main-nav-wrap">

          <nav class="main-nav" id="mainNav">

            <button
              class="nav-button menu-toggle"
              type="button"
              id="menuToggle"
            >
              ☰ ${esc(data.labels.menu)}
            </button>


            ${nav.map(item => item.key === 'courses' ? `

              <div class="nav-item">

                <button
                  class="nav-button"
                  type="button"
                  data-submenu-toggle
                >
                  ${esc(item.label)} ▾
                </button>

                <div class="submenu">

                  <a href="projeler.html?lang=${lang}">
                    ${esc(data.pages.courses.title)}
                  </a>

                  ${courseLinks}

                </div>

              </div>

            ` : `

              <a
                class="nav-link ${item.page === page ? 'active' : ''}"
                href="${urlFor(item.file)}"
              >
                ${esc(item.label)}
              </a>

            `).join('')}

          </nav>

        </div>

      </header>
    `;
  }


  function profileCard(data) {
    const p = data.profile;

    const links = (p.links || [])
      .filter(x => x.label || x.url)
      .map(x => `
        <a
          href="${esc(x.url || '#')}"
          ${x.url?.startsWith('http')
            ? 'target="_blank" rel="noopener"'
            : ''}
        >
          ${esc(x.label || x.url)}
        </a>
      `)
      .join('');


    return `
      <aside class="profile-card">

        <img
          class="profile-photo"
          src="${esc(p.photo || 'assets/img/profile-placeholder.svg')}"
          alt="${esc(p.name || data.labels.namePlaceholder)}"
        >

        <div>

          <h2>
            ${placeholder(
              p.name,
              data.labels.namePlaceholder
            )}
          </h2>

          <p>
            ${placeholder(
              p.shortBio,
              data.labels.shortBioPlaceholder
            )}
          </p>

          ${links
            ? `<div class="mini-links">${links}</div>`
            : ''
          }

        </div>

      </aside>
    `;
  }


  function pageHeading(data, p) {
    return `
      <div class="eyebrow">
        ${esc(data.labels.websiteSection)}
      </div>

      <h1 class="page-title">
        ${esc(p.title)}
      </h1>
    `;
  }


  function pageContent(data) {
    const p = data.pages[page] || data.pages.home;

    if (page === 'home') {
      return renderHome(data, p);
    }

    if (page === 'about') {
      return renderAbout(data, p);
    }

    if (page === 'research') {
      return renderCardsPage(data, p, 'research');
    }

    if (page === 'news') {
      return renderCardsPage(data, p, 'news');
    }

    if (page === 'publications') {
      return renderPublications(data, p);
    }

    if (page === 'courses') {
      return renderCourses(data, p);
    }

    if (page === 'course') {
      return renderCourse(data);
    }

    if (page === 'calendar') {
      return renderCalendar(data, p);
    }

    if (page === 'contact') {
      return renderContact(data, p);
    }

    return pageHeading(data, p);
  }


  function renderHome(data, p) {

    const education = (p.education || [])
      .map(x => `
        <li>
          <strong>${esc(x.degree || '')}</strong>
          ${x.school ? ` — ${esc(x.school)}` : ''}
          ${x.year ? `, ${esc(x.year)}` : ''}
        </li>
      `)
      .join('');


    const interests = (p.researchInterests || [])
      .map(x => `<li>${esc(x)}</li>`)
      .join('');


    const research =
      cards(p.latestResearch || [], data.labels);

    const events =
      cards(p.upcomingEvents || [], data.labels);


    return `
      ${pageHeading(data,p)}

      <section class="section">

        <div class="two-col">

          <div>

            <h2>
              ${esc(p.educationTitle)}
            </h2>

            ${
              education
                ? `<ul class="clean-list">${education}</ul>`
                : `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
            }

          </div>


          <div>

            <h2>
              ${esc(p.cvTitle)}
            </h2>

            <p>
              ${placeholder(
                p.cvText,
                data.labels.emptySection
              )}
            </p>

            ${
              p.cvUrl
                ? `<a class="btn secondary" href="${esc(p.cvUrl)}">${esc(p.cvButton)}</a>`
                : ''
            }

          </div>

        </div>

      </section>


      <section class="section">

        <h2>
          ${esc(p.interestsTitle)}
        </h2>

        ${
          interests
            ? `<ul class="clean-list">${interests}</ul>`
            : `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>


      <section class="section">

        <h2>
          ${esc(p.latestResearchTitle)}
        </h2>

        ${
          research ||
          `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>


      <section class="section">

        <h2>
          ${esc(p.eventsTitle)}
        </h2>

        ${
          events ||
          `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>
    `;
  }


  function renderAbout(data, p) {

    const edu = (p.education || [])
      .map(x => `
        <li>
          <strong>${esc(x.period || '')}</strong>
          ${esc(x.text || '')}
        </li>
      `)
      .join('');


    const ints = (p.researchInterests || [])
      .map(x => `<li>${esc(x)}</li>`)
      .join('');


    return `
      ${pageHeading(data,p)}

      <section class="section">

        <h2>
          ${esc(p.aboutTitle)}
        </h2>

        <div>
          ${
            p.aboutHtml ||
            `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
          }
        </div>

      </section>


      <section class="section">

        <div class="two-col">

          <div>

            <h2>
              ${esc(p.educationTitle)}
            </h2>

            ${
              edu
                ? `<ul class="clean-list">${edu}</ul>`
                : `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
            }

          </div>


          <div>

            <h2>
              ${esc(p.interestsTitle)}
            </h2>

            ${
              ints
                ? `<ul class="clean-list">${ints}</ul>`
                : `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
            }

          </div>

        </div>

      </section>
    `;
  }


  function renderCardsPage(data, p) {

    return `
      ${pageHeading(data,p)}

      <section class="section">

        <p>
          ${placeholder(
            p.intro,
            data.labels.emptySection
          )}
        </p>

      </section>


      <section class="section">

        ${
          cards(
            p.items || [],
            data.labels
          ) ||
          `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>
    `;
  }


  function cards(items, labels) {

    if (!items.length) {
      return '';
    }


    return `
      <div class="card-grid">

        ${items.map(x => `

          <article class="item-card">

            <img
              src="${esc(x.image || 'assets/img/project-placeholder.svg')}"
              alt=""
            >

            <div class="item-card-body">

              <h3>
                ${esc(x.title || labels.itemTitle)}
              </h3>

              ${
                x.date
                  ? `<div class="eyebrow">${esc(x.date)}</div>`
                  : ''
              }

              <p>
                ${esc(x.description || '')}
              </p>

              ${
                x.url
                  ? `
                    <a
                      href="${esc(x.url)}"
                      target="_blank"
                      rel="noopener"
                    >
                      ${esc(x.linkLabel || labels.details)}
                    </a>
                  `
                  : ''
              }

            </div>

          </article>

        `).join('')}

      </div>
    `;
  }


  function renderPublications(data, p) {

    const group = (title, list) => `

      <div class="publication-group">

        <h2>
          ${esc(title)}
        </h2>

        ${
          list?.length
            ? `
              <ol class="publication-list">

                ${list.map(x => `
                  <li>

                    ${esc(x.citation || '')}

                    ${
                      x.url
                        ? `
                          <a
                            href="${esc(x.url)}"
                            target="_blank"
                            rel="noopener"
                          >
                            [${esc(x.linkLabel || 'link')}]
                          </a>
                        `
                        : ''
                    }

                  </li>
                `).join('')}

              </ol>
            `
            : `
              <p class="placeholder">
                ${esc(data.labels.emptySection)}
              </p>
            `
        }

      </div>
    `;


    return `
      ${pageHeading(data,p)}

      <section class="section">

        ${group(
          p.journalTitle,
          p.journal
        )}

        ${group(
          p.conferenceTitle,
          p.conference
        )}

        ${group(
          p.otherTitle,
          p.other
        )}

      </section>
    `;
  }


  function renderCourses(data, p) {

    const rows = (p.items || []).map(c => `

      <div class="course-row">

        <div>

          <h3>
            ${esc(c.code || c.title || '')}
          </h3>

          <div class="identity-meta">
            ${esc(c.title || '')}
          </div>

        </div>


        <a href="proje.html?lang=${lang}&id=${encodeURIComponent(c.id)}">
          ${esc(data.labels.details)}
        </a>

      </div>

    `).join('');


    return `
      ${pageHeading(data,p)}

      <section class="section">

        <p>
          ${placeholder(
            p.intro,
            data.labels.emptySection
          )}
        </p>

      </section>


      <section class="section">

        <div class="course-list">

          ${
            rows ||
            `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
          }

        </div>

      </section>
    `;
  }


  function renderCourse(data) {

    const id = qs.get('id');

    const c =
      (data.pages.courses.items || [])
      .find(x => x.id === id) || {};


    const materials =
      (c.materials || [])
      .map(x => `
        <li>
          ${
            x.url
              ? `
                <a
                  href="${esc(x.url)}"
                  target="_blank"
                  rel="noopener"
                >
                  ${esc(x.label || x.url)}
                </a>
              `
              : esc(x.label || '')
          }
        </li>
      `)
      .join('');


    return `

      <div class="eyebrow">
        ${esc(data.pages.courses.title)}
      </div>

      <h1 class="page-title">
        ${esc(
          c.code ||
          c.title ||
          data.labels.course
        )}
      </h1>


      <section class="section">

        <h2>
          ${esc(
            c.title ||
            data.labels.courseTitle
          )}
        </h2>

        <p>
          ${placeholder(
            c.description,
            data.labels.emptySection
          )}
        </p>

      </section>


      <section class="section">

        <h2>
          ${esc(data.labels.courseMaterials)}
        </h2>

        ${
          materials
            ? `<ul class="clean-list">${materials}</ul>`
            : `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>


      <section class="section">

        <h2>
          ${esc(data.labels.announcements)}
        </h2>

        ${
          c.announcementsHtml ||
          `<p class="placeholder">${esc(data.labels.emptySection)}</p>`
        }

      </section>
    `;
  }


  function renderCalendar(data,p) {

    return `
      ${pageHeading(data,p)}

      <section class="section">

        ${
          p.embedUrl
            ? `
              <iframe
                class="calendar-frame"
                src="${esc(p.embedUrl)}"
                loading="lazy"
              ></iframe>
            `
            : `
              <p class="placeholder">
                ${esc(data.labels.calendarHint)}
              </p>
            `
        }

      </section>
    `;
  }


  function renderContact(data,p) {

    return `
      ${pageHeading(data,p)}

      <section class="section">

        <div class="contact-grid">


          <div>

            <h2>
              ${esc(p.infoTitle)}
            </h2>

            <p>

              <strong>
                ${placeholder(
                  data.profile.name,
                  data.labels.namePlaceholder
                )}
              </strong>

              <br>

              ${placeholder(
                data.profile.institution,
                data.labels.institutionPlaceholder
              )}

              <br>

              ${placeholder(
                data.profile.department,
                data.labels.departmentPlaceholder
              )}

            </p>


            <p>

              ${
                p.email
                  ? `
                    <a href="mailto:${esc(p.email)}">
                      ${esc(p.email)}
                    </a>
                  `
                  : `
                    <span class="placeholder">
                      ${esc(data.labels.emailPlaceholder)}
                    </span>
                  `
              }

              <br>

              ${placeholder(
                p.phone,
                data.labels.phonePlaceholder
              )}

            </p>


            <p>
              ${placeholder(
                p.address,
                data.labels.addressPlaceholder
              )}
            </p>

          </div>


          <div>

            <h2>
              ${esc(p.formTitle)}
            </h2>


            <form
              class="contact-form"
              id="contactForm"
            >

              <div class="field">

                <label>
                  ${esc(data.labels.formName)}
                </label>

                <input
                  name="name"
                  required
                >

              </div>


              <div class="field">

                <label>
                  ${esc(data.labels.formEmail)}
                </label>

                <input
                  type="email"
                  name="email"
                  required
                >

              </div>


              <div class="field">

                <label>
                  ${esc(data.labels.formSubject)}
                </label>

                <input
                  name="subject"
                >

              </div>


              <div class="field">

                <label>
                  ${esc(data.labels.formMessage)}
                </label>

                <textarea
                  name="message"
                  required
                ></textarea>

              </div>


              <button
                class="btn"
                type="submit"
              >
                ${esc(data.labels.send)}
              </button>


              <div
                class="form-note"
                id="formNote"
              >
                ${esc(data.labels.formSetupHint)}
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

          <div>
            ${placeholder(
              data.footer.left,
              data.labels.footerPlaceholder
            )}
          </div>

          <div>
            ${placeholder(
              data.footer.right,
              data.labels.footerPlaceholder
            )}
          </div>

        </div>

      </footer>
    `;
  }


  function bindUI(data) {

    const nav =
      document.querySelector('#mainNav');

    const menu =
      document.querySelector('#menuToggle');


    if (menu) {

      if (innerWidth <= 900) {
        nav.classList.add('collapsed');
      }

      menu.addEventListener(
        'click',
        () => nav.classList.toggle('collapsed')
      );
    }


    document
      .querySelectorAll('[data-submenu-toggle]')
      .forEach(btn =>
        btn.addEventListener('click', e => {

          if (innerWidth <= 900) {
            e.currentTarget
              .parentElement
              .classList
              .toggle('open');
          }

        })
      );


    const form =
      document.querySelector('#contactForm');


    if (form) {

      form.addEventListener(
        'submit',
        async e => {

          e.preventDefault();

          const note =
            document.querySelector('#formNote');

          const endpoint =
            data.pages.contact.formEndpoint;


          if (!endpoint) {

            note.textContent =
              data.labels.formNotConfigured;

            return;
          }


          try {

            const res =
              await fetch(
                endpoint,
                {
                  method: 'POST',
                  body: new FormData(form),
                  headers: {
                    'Accept': 'application/json'
                  }
                }
              );


            if (!res.ok) {
              throw new Error('send failed');
            }


            form.reset();

            note.textContent =
              data.labels.formSuccess;

          } catch {

            note.textContent =
              data.labels.formError;
          }

        }
      );
    }
  }

})();
