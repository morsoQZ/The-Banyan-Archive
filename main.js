const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");
const main = document.querySelector(".main");
const floatingTitle = document.querySelector(".floating-title");
const routeBack = document.querySelector(".go-back");

let floatingTitleFrame = 0;
let articleIndexPromise = null;

const articleIndexSrc = "/articles/articles.json";

const sectionPaths = {
  overview: "/",
  archive: "/archive/",
  "time-line": "/time-line/",
  submit: "/submit/",
  about: "/about/",
  review: "/review/",
};

const pathSections = {
  "/": "overview",
  "/index.html": "overview",
  "/archive/": "archive",
  "/time-line/": "time-line",
  "/submit/": "submit",
  "/about/": "about",
  "/review/": "review",
};

function normalizePath(pathname) {
  if (pathname.endsWith("/index.html")) return "/index.html";
  if (pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getSectionFromPath() {
  const path = normalizePath(window.location.pathname);
  return pathSections[path] || "overview";
}

function getArticleSlugFromPath() {
  const path = normalizePath(window.location.pathname);
  const match = path.match(/^\/articles\/([^/]+)\/$/);

  return match ? decodeURIComponent(match[1]) : "";
}

function getRouteFromPath() {
  const articleSlug = getArticleSlugFromPath();

  if (articleSlug) {
    return {
      sectionId: "article",
      articleSlug,
    };
  }

  return {
    sectionId: getSectionFromPath(),
    articleSlug: "",
  };
}

function revealTextBlocks(container) {
  const blocks = container.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, li, hr, table, math, .math, .katex, .MathJax",
  );
  const mainRect = main?.getBoundingClientRect();
  const visibleBlocks = mainRect
    ? [...blocks].filter((block) => block.getBoundingClientRect().top < mainRect.bottom)
    : [];
  const visibleCount = Math.max(visibleBlocks.length, 1);
  const delayStep = visibleCount > 1 ? 200 / (visibleCount - 1) : 0;

  blocks.forEach((block, index) => {
    block.classList.add("reveal-block");
    block.style.animationDelay = `${Math.round(index * delayStep)}ms`;
  });
}

function showLoadingState(page) {
  page.setAttribute("aria-busy", "true");
  page.innerHTML = `
    <div class="page-loader" role="status" aria-live="polite">
      <span></span>
      <span></span>
      <span></span>
      <p>正在加载</p>
    </div>
  `;
}

async function fetchHtmlFragment(src) {
  const contentPath = src.startsWith("/") ? src : `/${src}`;
  const response = await fetch(contentPath);

  if (!response.ok) {
    throw new Error(`Failed to load ${contentPath}`);
  }

  const html = await response.text();

  if (html.includes("<!doctype html") || html.includes('<div class="app">')) {
    throw new Error(`${contentPath} returned the full app shell instead of article content`);
  }

  return html;
}

async function loadArticleIndex() {
  if (!articleIndexPromise) {
    articleIndexPromise = fetch(articleIndexSrc).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${articleIndexSrc}`);
      }

      return response.json();
    });
  }

  return articleIndexPromise;
}

async function loadArticleContent(slug) {
  const articlePage = document.getElementById("article");

  if (!articlePage) return;

  if (articlePage.dataset.articleSlug === slug && articlePage.dataset.loaded === "true") {
    return;
  }

  showLoadingState(articlePage);

  try {
    const articleIndex = await loadArticleIndex();
    const article = articleIndex.find((item) => item.slug === slug);

    if (!article) {
      throw new Error(`Article not found: ${slug}`);
    }

    const html = await fetchHtmlFragment(article.src);

    articlePage.innerHTML = html;
    articlePage.dataset.articleSlug = slug;
    articlePage.dataset.loaded = "true";
    revealTextBlocks(articlePage);
    scheduleFloatingTitleUpdate();
  } catch (error) {
    articlePage.innerHTML = "<p>文章加载失败，请稍后再试。</p>";
    articlePage.dataset.loaded = "false";
    console.error(error);
  } finally {
    articlePage.removeAttribute("aria-busy");
  }
}

function getActivePage() {
  return document.querySelector(".page.is-active");
}

function setFloatingTitle(title) {
  if (!floatingTitle) return;

  if (title) {
    floatingTitle.textContent = title;
    floatingTitle.classList.add("is-visible");
    floatingTitle.setAttribute("aria-hidden", "false");
  } else {
    floatingTitle.classList.remove("is-visible");
    floatingTitle.setAttribute("aria-hidden", "true");
  }
}

function updateFloatingTitle() {
  if (!main || !floatingTitle) return;

  const activePage = getActivePage();
  const heading = activePage?.querySelector("h1");

  if (!heading) {
    setFloatingTitle("");
    return;
  }

  const mainRect = main.getBoundingClientRect();
  const headingRect = heading.getBoundingClientRect();
  const headingHasLeftMain = headingRect.bottom <= mainRect.top;

  setFloatingTitle(headingHasLeftMain ? heading.textContent.trim() : "");
}

function scheduleFloatingTitleUpdate() {
  if (floatingTitleFrame) return;

  floatingTitleFrame = requestAnimationFrame(() => {
    floatingTitleFrame = 0;
    updateFloatingTitle();
  });
}

function resetMainScroll() {
  if (!main) return;

  main.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant",
  });
}

async function loadPageContent(page) {
  const src = page.dataset.pageSrc;

  // 如果这个 page 没有 data-page-src，就不加载外部文件
  if (!src) return;

  // 如果已经加载过了，就不重复加载
  if (page.dataset.loaded === "true") return;

  showLoadingState(page);

  try {
    const html = await fetchHtmlFragment(src);

    page.innerHTML = html;
    revealTextBlocks(page);
    page.dataset.loaded = "true";
    scheduleFloatingTitleUpdate();
  } catch (error) {
    page.innerHTML = "<p>内容加载失败，请稍后再试。</p>";
    console.error(error);
  } finally {
    page.removeAttribute("aria-busy");
  }
}

function showSection(sectionId, shouldUpdateUrl = false) {
  const activePage = document.getElementById(sectionId);

  if (!activePage) return false;

  navItems.forEach((navItem) => {
    const isActive = navItem.dataset.section === sectionId;

    navItem.classList.toggle("is-active", isActive);

    if (isActive) {
      navItem.setAttribute("aria-current", "page");
    } else {
      navItem.removeAttribute("aria-current");
    }
  });

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === sectionId);
  });

  if (routeBack) {
    routeBack.classList.toggle("is-visible", sectionId === "article");
  }

  loadPageContent(activePage);
  scheduleFloatingTitleUpdate();

  if (shouldUpdateUrl) {
    const nextPath = sectionPaths[sectionId] || "/";

    if (window.location.pathname !== nextPath) {
      history.pushState({ sectionId }, "", nextPath);
    }
  }

  return true;
}

function showRoute(route, shouldUpdateUrl = false) {
  const didShowSection = showSection(route.sectionId, false);

  if (!didShowSection) return false;

  if (route.articleSlug) {
    loadArticleContent(route.articleSlug);
  }

  if (shouldUpdateUrl) {
    const nextPath = route.articleSlug
      ? `/articles/${encodeURIComponent(route.articleSlug)}/`
      : sectionPaths[route.sectionId] || "/";

    if (window.location.pathname !== nextPath) {
      history.pushState(route, "", nextPath);
    }
  }

  return true;
}

function showCurrentRoute() {
  return showRoute(getRouteFromPath());
}

function goBackFromArticle() {
  const fromPath = history.state?.fromPath;

  if (fromPath) {
    history.back();
    return;
  }

  showSection("about", true);
  resetMainScroll();
}

function initializeRoute() {
  const initialRoute = getRouteFromPath();
  const didShowRoute = showRoute(initialRoute);

  if (didShowRoute) {
    history.replaceState(initialRoute, "", window.location.pathname);
  }
}

initializeRoute();

navItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    const target = item.dataset.section;

    if (!target) return;

    event.preventDefault();

    if (showSection(target, true)) {
      resetMainScroll();
    }
  });
});

window.addEventListener("popstate", () => {
  if (showCurrentRoute()) {
    resetMainScroll();
  }
});

routeBack?.addEventListener("click", () => {
  goBackFromArticle();
});

main?.addEventListener("click", (event) => {
  const link = event.target.closest("a");

  if (!link || link.origin !== window.location.origin) return;

  event.preventDefault();

  history.pushState(
    {
      fromPath: window.location.pathname,
    },
    "",
    link.href,
  );

  showCurrentRoute();
  resetMainScroll();
});

main?.addEventListener("scroll", scheduleFloatingTitleUpdate, { passive: true });
window.addEventListener("resize", scheduleFloatingTitleUpdate);
