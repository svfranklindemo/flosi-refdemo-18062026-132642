import { getMetadata, fetchPlaceholders } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getHostname } from '../../scripts/utils.js';

import {
  getNavigationMenu, formatNavigationJsonData,
} from './navigation.js';
import {
  getLanguage, getSiteName, TAG_ROOT, PATH_PREFIX, SUPPORTED_LANGUAGES, computeLocalizedUrl, discoverLanguagesFromPlaceholders,
} from '../../scripts/utils.js';
import {
  button,
  div,
  img,
  span,
  a,
} from '../../scripts/dom-helpers.js';

import { isAuthorEnvironment } from '../../scripts/scripts.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');
const siteName = await getSiteName();

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
    const navSections = sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li');
    if (navSections && navSections.length > 0) {
      navSections.forEach((section) => {
        section.setAttribute('aria-expanded', expanded);
      });
    }
}

async function overlayLoad(navSections) {
  const langCode = getLanguage();
  const placeholdersData = await fetchLanguagePlaceholders();
  const navOverlay = navSections.querySelector(constants.NAV_MENU_OVERLAY_WITH_SELECTOR);
  if (!navOverlay) {
    const structuredNav = formatNavigationJsonData(window.navigationData[`/${langCode}`]);
    // Add navigation menu to header
    navSections.append(getNavigationMenu(structuredNav, placeholdersData));
  }
  const rightColumn = navSections.querySelector('.nav-menu-column.right');
  const leftColumn = navSections.querySelector('.nav-menu-column.left');
  isDesktop.addEventListener('change', () => closesideMenu(leftColumn, rightColumn));
  document.body.addEventListener('click', (e) => closesearchbar(e, navSections));
  document.body.addEventListener('keydown', (e) => closesearchbar(e, navSections));
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
async function toggleMenu(nav, navSections, forceExpanded = null) {

  /*
  if (window.navigationData) {
    await overlayLoad(navSections);
  } else {
    return;
  }*/
  
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}


function settingAltTextForSearchIcon() {
  const searchImage = document.querySelector('.icon-search-light');
  if (!searchImage) {
    // eslint-disable-next-line no-console
    console.debug('header: .icon-search-light not found; skipping search icon init');
    return;
  }
  searchImage.style.cursor = 'pointer';
  searchImage.addEventListener('click', () => {
    createSearchBox();
  });
  searchImage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      createSearchBox();
      e.currentTarget.nextElementSibling.focus();
    }
  });
  //searchImage.setAttribute('title', listOfAllPlaceholdersData.searchAltText || 'Search');
}


function handleEnterKey(event) {
  if (event.key !== 'Enter') return;
  const inputValue = document.querySelector('.search-container input').value;
  //const url = (listOfAllPlaceholdersData.searchRedirectUrl || 'https://wknd.site/en/search?q=') + inputValue;
  
  const url = `/content/${siteName}/search-results.html?q=`+ inputValue;

  if (inputValue) window.location.href = url;
}

function createSearchBox() {
  const navWrapper = document.querySelector('.nav-wrapper');
  const headerWrapper = document.querySelector('.header-wrapper');
  const navTools = document.querySelector('.nav-tools p');
  let searchContainer = headerWrapper.querySelector('.search-container');
  let cancelContainer = navWrapper.querySelector('.cancel-container');
  let overlay = document.querySelector('.overlay');
  const searchImage = document.querySelector('.icon-search-light');
  document.body.classList.add('no-scroll');
  if (searchContainer) {
    const isVisible = searchContainer.style.display !== 'none';
    searchContainer.style.display = isVisible ? 'none' : 'flex';
    if (cancelContainer) {
      cancelContainer.style.display = isVisible ? 'none' : 'flex';
    }
    overlay.style.display = isVisible ? 'none' : 'block';

    searchImage.style.display = isVisible ? 'block' : 'none';
  } else {
    cancelContainer = div(
      {
        class: 'cancel-container',
        role: 'button',
        tabindex: 0,
        'aria-label': 'close Search Box',
      },
    );
    const cancelImg = img({ class: 'cancel-image' });
    cancelImg.src = `${window.hlx.codeBasePath}/icons/cancel.svg`;
    cancelImg.alt = 'cancel';
    cancelImg.style.cssText = 'display: flex; cursor: pointer;';
    cancelContainer.addEventListener('click', () => {
      closeSearchBox();
    });
    cancelContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        closeSearchBox();
      }
    });
    cancelContainer.appendChild(cancelImg);
    navTools.appendChild(cancelContainer);
    // Hide search icon
    searchImage.style.display = 'none';
    searchContainer = div({ class: 'search-container' });
    overlay = div({ class: 'overlay' });
    document.body.appendChild(overlay);
    const searchInputContainer = div({ class: 'search-input-container' });
    const searchInputBox = document.createElement('input');
    const searchIcon = img({ class: 'search-icon' });
    searchIcon.src = `${window.hlx.codeBasePath}/icons/search-light.svg`;
    searchIcon.alt = 'search';
    searchIcon.addEventListener('click', () => {
      if (searchInputBox.value) {
        ///window.location.href = (listOfAllPlaceholdersData.searchRedirectUrl || '<sitename>/en/search?q=') + searchInputBox.value;
        window.location.href = `/content/${siteName}/search-results.html?q=` + searchInputBox.value;
      }
    });

    Object.assign(searchInputBox, {
      type: 'search',
      id: 'search-input',
      name: 'myInput',
      placeholder: 'Search WKND',
      value: '',
      autocomplete: 'off',
    });
    searchInputBox.addEventListener('keydown', handleEnterKey);
    searchInputContainer.append(searchInputBox, searchIcon);
    const searchContainerWrapper = div({ class: 'search-input-wrapper' });
    searchContainerWrapper.append(searchInputContainer);
    searchContainer.appendChild(searchContainerWrapper);
    
    navTools.appendChild(searchContainer);
  }
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */

function closeSearchBox() {
  const navWrapper = document.querySelector('.nav-wrapper');
  const headerWrapper = document.querySelector('.header-wrapper');
  const searchContainer = headerWrapper ? headerWrapper.querySelector('.search-container') : null;
  const cancelContainer = navWrapper ? navWrapper.querySelector('.cancel-container') : null;
  // const overlay = document.querySelector('.overlay');
  //const searchImage = document.querySelector('.-light');
  const searchImage = document.querySelector('.icon-search-light');
  // if(searchContainer){
  //   searchContainer.style.display = 'none';
  // }
  if(cancelContainer){
    cancelContainer.style.display = 'none';
  }
  if (searchImage) {
    searchImage.style.display = 'flex';
  }
  // if (overlay) {
  //   overlay.style.display = 'none';
  // }
  document.body.classList.remove('no-scroll');
}

const closeSearchOnFocusOut = (e, navTools) => {
  const headerWrapper = document.querySelector('.header-wrapper');
  const searchContainer = headerWrapper.querySelector('.search-container');

  if (searchContainer && searchContainer.style.display !== 'none') {
    const cancelContainer = navTools ? navTools.querySelector('.cancel-container') : null;
    const searchImage = navTools ? navTools.querySelector('.icon-search-light') : null;
    const isClickInside = (searchContainer && searchContainer.contains && searchContainer.contains(e.target))
    || (cancelContainer && cancelContainer.contains && cancelContainer.contains(e.target))
    || (searchImage && searchImage.contains && searchImage.contains(e.target));
    if (!isClickInside) {
      closeSearchBox();
    }
  }
};

async function addLogoLink(langCode) {

  //urn:aemconnection:/content/wknd-universal/language-masters/en/magazine/jcr:content
  const currentLang = langCode || getLanguage();
  const aueResource = document.body.getAttribute('data-aue-resource')
    ?.replace(new RegExp(`^.*?(\\/content.*?\\/${currentLang}).*$`), '$1');
  
  let logoLink = '';
    if(aueResource !== null && aueResource !== undefined && aueResource !== ''){
      logoLink = aueResource+'.html';
    } else {
      if(langCode === 'en') {
        logoLink = window.location.origin;
      } else {
        logoLink = window.location.origin + `/${langCode}`;
      }
    }

    try {
      const logoImage = document.querySelector('.nav-brand img');
      const anchor = document.createElement('a');
      Object.assign(anchor, {
          href: logoLink,
          title: logoImage?.alt,
      });
      const picture = document.querySelector('.nav-brand picture');
      if (picture) anchor.appendChild(picture);
      const targetElement = document.querySelector('.nav-brand .default-content-wrapper');
      if (targetElement) {
          targetElement.appendChild(anchor);
      }
    } catch (error) {
      console.error('Error in addLogoLink:', error);
    }
}


async function applyCFTheme(themeCFReference) {
   if (!themeCFReference) return;
  
  const CONFIG = {
    WRAPPER_SERVICE_URL: 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf',
    GRAPHQL_QUERY: '/graphql/execute.json/ref-demo-eds/BrandThemeByPath',
    EXCLUDED_THEME_KEYS: new Set(['brandSite', 'brandLogo'])
  };

  try {
    const decodedThemeCFReference = decodeURIComponent(themeCFReference);
    const hostnameFromPlaceholders = await getHostname();
    const hostname = hostnameFromPlaceholders ? hostnameFromPlaceholders : getMetadata('hostname');
    const aemauthorurl = getMetadata('authorurl') || '';
    const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');
    const isAuthor = isAuthorEnvironment();

    // Prepare request configuration based on environment
    const requestConfig = isAuthor 
      ? {
          url: `${aemauthorurl}${CONFIG.GRAPHQL_QUERY};path=${decodedThemeCFReference};ts=${Date.now()}`,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      : {
          url: `${CONFIG.WRAPPER_SERVICE_URL}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            graphQLPath: `${aempublishurl}${CONFIG.GRAPHQL_QUERY}`,
            cfPath: decodedThemeCFReference,
            variation: `master;ts=${Date.now()}`
          })
        };

    // Fetch theme data
    const response = await fetch(requestConfig.url, {
      method: requestConfig.method,
      headers: requestConfig.headers,
      ...(requestConfig.body && { body: requestConfig.body })
    });

    if (!response.ok) {
       console.error(`HTTP error! status: ${response.status}`);
    }

    let themeCFRes;

    
    try {


       const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.warn('Empty response received from server');
        return;
      }
      themeCFRes = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
    }
    const themeColors = themeCFRes?.data?.brandThemeByPath?.item;

    if (!themeColors) {
      console.warn('No theme data found in the response');
      return;
    }

    // Apply theme colors to CSS variables
    const cssVariables = Object.entries(themeColors)
      .filter(([key, value]) => 
        value != null && !CONFIG.EXCLUDED_THEME_KEYS.has(key)
      )
      .map(([key, value]) => `  --brand-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
      .join('\n');

    if (cssVariables) {
      const styleElement = document.createElement('style');
      styleElement.textContent = `:root {\n${cssVariables}\n}`;
      document.head.appendChild(styleElement);
    }

  } catch (error) {
    console.error('Error applying theme:', error);
  }
}


/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  //const locale = getMetadata('nav');

  const themeCFReference = getMetadata('theme_cf_reference');
  applyCFTheme(themeCFReference);
  

  
  const navMeta = getMetadata('nav');
  const langCode = getLanguage();
  console.log("langCode :"+langCode);

   const isAuthor = isAuthorEnvironment();
    let navPath =`/${langCode}/nav`;
  
    if(isAuthor){
      navPath = navMeta ? new URL(navMeta, window.location).pathname : `/content/${siteName}${PATH_PREFIX}/${langCode}/nav`;
    }
   

  
  //const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  //console.log("pathSegments header: ", pathSegments);
  const parentPath = pathSegments.length > 2 ? `/${pathSegments.slice(0, 3).join('/')}` : '/';
  //console.log("parentPath header: ", parentPath);
  //const navPath = locale ? `/${locale}/nav` : parentPath+'/nav';
  //const navPath = parentPath=='/' ? locale ? `/${locale}/nav` : '/nav' : locale ? `/${locale}/nav` : parentPath+'/nav';
  //console.log("navPath header: ", navPath);
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment && fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const contentWrapper = nav.querySelector('.nav-tools > div[class = "default-content-wrapper"]');
    // Language switcher (minimal UI)
    try {
      const currentLang = getLanguage();
      const langWrap = document.createElement('div');
      langWrap.className = 'lang-switcher';
      const langBtn = document.createElement('button');
      langBtn.type = 'button';
      langBtn.className = 'lang-button';
      langBtn.setAttribute('aria-haspopup', 'listbox');
      langBtn.setAttribute('aria-expanded', 'false');
      langBtn.textContent = currentLang.toUpperCase();
      const langMenu = document.createElement('ul');
      langMenu.className = 'lang-menu';
      langMenu.setAttribute('role', 'listbox');
      const langs = await discoverLanguagesFromPlaceholders();
      const uniqueLangs = [...new Set(langs && langs.length ? langs : ['en'])];
      if (uniqueLangs.length <= 1) {
        langBtn.setAttribute('disabled', 'true');
        langWrap.classList.add('single-lang');
      }
      const regionNames = (() => {
        try { return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }); } catch (e) { return null; }
      })();
      const languageNames = (() => {
        try { return new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }); } catch (e) { return null; }
      })();

      uniqueLangs.forEach((raw) => {
        const code = String(raw).replace('_', '-').toLowerCase();
        const [langPart, regionPart] = code.split('-');
        const displayCode = `${langPart}${regionPart ? `-${regionPart}` : ''}`.toUpperCase();
        const country = regionPart ? (regionNames ? regionNames.of(regionPart.toUpperCase()) : regionPart.toUpperCase())
          : (languageNames ? languageNames.of(langPart) : langPart.toUpperCase());

        const li = document.createElement('li');
        li.className = 'lang-item';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', langPart === currentLang ? 'true' : 'false');

        const link = document.createElement('a');
        // Use only language segment for routing if site paths are language-based
        link.href = computeLocalizedUrl(langPart);

        const pre = document.createElement('span');
        pre.className = 'lang-pretitle';
        pre.textContent = displayCode;

        const name = document.createElement('span');
        name.className = 'lang-country';
        name.textContent = country;

        link.append(name, pre);
        li.append(link);
        langMenu.append(li);
      });
      langBtn.addEventListener('click', () => {
        const expanded = langBtn.getAttribute('aria-expanded') === 'true';
        langBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        langWrap.classList.toggle('open', !expanded);
      });
      document.addEventListener('click', (e) => {
        if (!langWrap.contains(e.target)) {
          langBtn.setAttribute('aria-expanded', 'false');
          langWrap.classList.remove('open');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          langBtn.setAttribute('aria-expanded', 'false');
          langWrap.classList.remove('open');
        }
      });
      langWrap.append(langBtn, langMenu);
      const targetContainer = contentWrapper || navTools;
      targetContainer.append(langWrap);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Language switcher init failed', e);
    }
    // Close Search Container on Focus out
    document.addEventListener('click', (e) => {
      closeSearchOnFocusOut(e, navTools);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const headerWrapper = document.querySelector('.header-wrapper');
        const searchContainer = headerWrapper ? headerWrapper.querySelector('.search-container') : null;
        if (searchContainer && searchContainer.style.display !== 'none' && searchContainer.contains(e.target)) {
          closeSearchBox();
        }
      }
    });
  }
  
  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <div class="top-bar-inner">
      <ul class="top-bar-institutions">
        <li><a href="https://www.fiesp.com.br/" target="_blank" rel="noopener">FIESP</a></li>
        <li><a href="https://www.ciesp.com.br/" target="_blank" rel="noopener">CIESP</a></li>
        <li><a href="https://www.sesisp.org.br/" target="_blank" rel="noopener">SESI</a></li>
        <li><a href="https://www.sp.senai.br/" target="_blank" rel="noopener">SENAI</a></li>
        <li><a href="https://www.irs.org.br/" target="_blank" rel="noopener">IRS</a></li>
      </ul>
      <ul class="top-bar-social">
        <li><a href="https://www.facebook.com/senaisp" target="_blank" rel="noopener" aria-label="Facebook"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a></li>
        <li><a href="https://twitter.com/senaisp" target="_blank" rel="noopener" aria-label="X (Twitter)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a></li>
        <li><a href="https://www.youtube.com/senaisp" target="_blank" rel="noopener" aria-label="YouTube"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg></a></li>
        <li><a href="https://www.linkedin.com/company/senai-sp" target="_blank" rel="noopener" aria-label="LinkedIn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg></a></li>
        <li><a href="https://www.instagram.com/senaisp" target="_blank" rel="noopener" aria-label="Instagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a></li>
        <li><a href="https://wa.me/551133220050" target="_blank" rel="noopener" aria-label="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a></li>
      </ul>
    </div>
  `;

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.prepend(topBar);
  block.append(navWrapper);
  settingAltTextForSearchIcon();
  //fetchingPlaceholdersData();
  addLogoLink(langCode);
    // Ensure search icon mask uses correct base path in UE/author/local
    try {
      const iconEl = document.querySelector('header .search.search-icon .icon');
      if (iconEl && window.hlx && window.hlx.codeBasePath) {
        const iconUrl = `${window.hlx.codeBasePath}/icons/search.svg`;
        iconEl.style.webkitMask = `url(${iconUrl}) no-repeat center / contain`;
        iconEl.style.mask = `url(${iconUrl}) no-repeat center / contain`;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('search icon mask init skipped', e);
    }
}
