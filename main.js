const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

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

async function loadPageContent(page) {
  const src = page.dataset.pageSrc;

  // 如果这个 page 没有 data-page-src，就不加载外部文件
  if (!src) return;

  // 如果已经加载过了，就不重复加载
  if (page.dataset.loaded === "true") return;

  page.setAttribute("aria-busy", "true");
  page.innerHTML = `
    <div class="page-loader" role="status" aria-live="polite">
      <span></span>
      <span></span>
      <span></span>
      <p>正在加载</p>
    </div>
  `;

  try {
    const contentPath = src.startsWith("/") ? src : `/${src}`;
    const response = await fetch(contentPath);

    if (!response.ok) {
      throw new Error(`Failed to load ${contentPath}`);
    }

    const html = await response.text();

    if (html.includes("<!doctype html") || html.includes('<div class="app">')) {
      throw new Error(`${contentPath} returned the full app shell instead of article content`);
    }

    page.innerHTML = html;
    page.dataset.loaded = "true";
  } catch (error) {
    page.innerHTML = "<p>内容加载失败，请稍后再试。</p>";
    console.error(error);
  } finally {
    page.removeAttribute("aria-busy");
  }
}

function showSection(sectionId, shouldUpdateUrl = false) {
  const activePage = document.getElementById(sectionId);

  if (!activePage) return;

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

  loadPageContent(activePage);

  if (shouldUpdateUrl) {
    const nextPath = sectionPaths[sectionId] || "/";

    if (window.location.pathname !== nextPath) {
      history.pushState({ sectionId }, "", nextPath);
    }
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    const target = item.dataset.section;

    if (!target) return;

    event.preventDefault();
    showSection(target, true);
  });
});

window.addEventListener("popstate", () => {
  showSection(getSectionFromPath());
});

showSection(getSectionFromPath());
