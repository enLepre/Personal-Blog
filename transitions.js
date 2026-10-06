(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map();
  let busy = false;

  const sectionFromPath = (pathname) => {
    const file = pathname.split("/").pop() || "index.html";
    if (file === "research.html") return "research";
    if (file === "notes.html") return "notes";
    if (file === "essays.html") return "essays";
    if (file === "about.html") return "about";
    return "home";
  };

  const loadPage = async (href) => {
    const url = new URL(href, location.href).href;
    if (cache.has(url)) return cache.get(url);
    const request = fetch(url, { cache: "no-cache", credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("Page unavailable");
        return response.text();
      })
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    cache.set(url, request);
    return request;
  };

  const textFrame = (rect, style) => ({
    left: rect.left + "px",
    top: rect.top + "px",
    width: rect.width + "px",
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    color: style.color
  });

  /*
    Same typography-driven zoom used by WebsiteTest/news:
    animate left, top, width, font size and line height of one real text node.
    This avoids both stretched glyphs and the undersized/off-centre landing.
  */
  async function runTitleZoom({ source, target, duration = 950, keepAtEnd = false }) {
    if (!source || !target || reducedMotion.matches) return null;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sourceStyle = getComputedStyle(source);
    const targetStyle = getComputedStyle(target);

    const title = document.createElement("div");
    title.className = "title-journey-word";
    title.textContent = target.textContent.trim();

    Object.assign(title.style, {
      fontFamily: targetStyle.fontFamily,
      fontWeight: targetStyle.fontWeight,
      fontStyle: targetStyle.fontStyle,
      letterSpacing: targetStyle.letterSpacing === "normal" ? "0px" : targetStyle.letterSpacing
    });

    source.classList.add("title-journey-hidden");
    target.classList.add("title-journey-hidden");
    document.body.append(title);

    const animation = title.animate(
      [textFrame(sourceRect, sourceStyle), textFrame(targetRect, targetStyle)],
      {
        duration,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "both"
      }
    );

    try {
      await animation.finished;
    } catch (_) {}

    if (keepAtEnd) {
      animation.cancel();
      Object.assign(title.style, textFrame(targetRect, targetStyle));
      return {
        title,
        release() {
          title.remove();
          source.classList.remove("title-journey-hidden");
          target.classList.remove("title-journey-hidden");
        }
      };
    }

    animation.cancel();
    title.remove();
    source.classList.remove("title-journey-hidden");
    target.classList.remove("title-journey-hidden");
    return null;
  }

  function createOverlay() {
    const header = document.querySelector(".site-header");
    const footer = document.querySelector(".site-footer");
    const overlay = document.createElement("div");
    overlay.className = "title-journey-overlay";
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const footerHeight = footer ? footer.getBoundingClientRect().height : 0;
    overlay.style.top = headerBottom + "px";
    overlay.style.bottom = footerHeight + "px";
    document.body.append(overlay);
    return overlay;
  }

  async function revealMain(main, movingTitle) {
    const animation = main.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 420, easing: "ease-out", fill: "both" }
    );
    try {
      await animation.finished;
    } catch (_) {}
    animation.cancel();
    main.style.opacity = "1";

    // The moving word remains visible until the incoming page is fully revealed.
    movingTitle?.release();
  }

  async function navigate(href, targetSection, push = true) {
    if (busy) return;
    busy = true;
    document.body.classList.add("is-page-transitioning");

    let overlay;
    let heldTitle;

    try {
      const currentSection = document.body.dataset.page || "home";
      const currentTitle = document.querySelector(".page-title");
      const currentMenu = document.querySelector('[data-section="' + currentSection + '"]');
      const clickedMenu = document.querySelector('[data-section="' + targetSection + '"]');

      const destinationPromise = loadPage(href);

      if (!reducedMotion.matches) {
        overlay = createOverlay();

        // 1) Current page title returns precisely to its own menu label.
        if (currentTitle && currentMenu) {
          await runTitleZoom({
            source: currentTitle,
            target: currentMenu,
            duration: 950
          });
        }
      }

      const doc = await destinationPromise;
      const incoming = doc.querySelector("main");
      const currentMain = document.querySelector("main");
      if (!incoming || !currentMain) throw new Error("Invalid destination page");

      const destinationMain = document.importNode(incoming, true);
      document.title = doc.title;

      if (reducedMotion.matches) {
        currentMain.replaceWith(destinationMain);
        document.body.dataset.page = targetSection;
        if (push) history.pushState({ section: targetSection }, "", href);
        scrollTo(0, 0);
        return;
      }

      // Prepare the destination in the same viewport geometry as the real page.
      destinationMain.style.opacity = "0";
      overlay.append(destinationMain);

      const destinationTitle = destinationMain.querySelector(".page-title");
      if (!clickedMenu || !destinationTitle) throw new Error("Missing title target");

      // 2) Clicked menu label grows into the new page title.
      heldTitle = await runTitleZoom({
        source: clickedMenu,
        target: destinationTitle,
        duration: 1100,
        keepAtEnd: true
      });

      // Only after the title has landed do we reveal the rest of the page.
      await revealMain(destinationMain, heldTitle);
      heldTitle = null;

      destinationMain.style.removeProperty("opacity");
      currentMain.replaceWith(destinationMain);
      overlay.remove();
      overlay = null;

      document.body.dataset.page = targetSection;
      if (push) history.pushState({ section: targetSection }, "", href);
      scrollTo(0, 0);
    } catch (error) {
      console.error(error);
      location.assign(href);
    } finally {
      heldTitle?.release();
      overlay?.remove();
      document.body.classList.remove("is-page-transitioning");
      busy = false;
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href][data-section]");
    if (!link) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (link.target && link.target !== "_self")
    ) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    const targetSection = link.dataset.section || sectionFromPath(url.pathname);
    const currentSection = document.body.dataset.page || "home";
    if (targetSection === currentSection) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigate(url.href, targetSection, true);
  });

  window.addEventListener("popstate", async () => {
    if (busy) {
      location.reload();
      return;
    }

    const section = sectionFromPath(location.pathname);
    try {
      const doc = await loadPage(location.href);
      const incoming = doc.querySelector("main");
      const currentMain = document.querySelector("main");
      if (!incoming || !currentMain) throw new Error();
      currentMain.replaceWith(document.importNode(incoming, true));
      document.title = doc.title;
      document.body.dataset.page = section;
      scrollTo(0, 0);
    } catch (_) {
      location.reload();
    }
  });

  // Warm likely destinations so the zoom does not pause after the first phase.
  document.querySelectorAll("a[href][data-section]").forEach((link) => {
    const warm = () => loadPage(link.href).catch(() => {});
    link.addEventListener("mouseenter", warm, { once: true });
    link.addEventListener("focus", warm, { once: true });
  });
})();