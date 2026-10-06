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

  const waitForLayout = () => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const prepareMedia = async (root) => {
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(async (image) => {
      image.loading = "eager";
      try { await image.decode(); } catch (_) {}
    }));
    await waitForLayout();
  };

  const numericLineHeight = (style) => {
    if (style.lineHeight !== "normal") return style.lineHeight;
    const size = parseFloat(style.fontSize) || 16;
    return (size * 1.2) + "px";
  };

  const textFrame = (rect, style) => ({
    left: rect.left + "px",
    top: rect.top + "px",
    width: rect.width + "px",
    fontSize: style.fontSize,
    lineHeight: numericLineHeight(style),
    color: style.color
  });

  /*
    Uses the same typography-based motion as WebsiteTest/news-title-zoom:
    the browser re-typesets the word at every frame instead of scaling a bitmap.
  */
  async function runTitleZoom({ source, target, duration, keepAtEnd = false }) {
    if (!source || !target || reducedMotion.matches) return null;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sourceStyle = getComputedStyle(source);
    const targetStyle = getComputedStyle(target);

    const moving = document.createElement("div");
    moving.className = "title-journey-word";
    moving.textContent = target.textContent.trim();

    Object.assign(moving.style, {
      fontFamily: targetStyle.fontFamily,
      fontWeight: targetStyle.fontWeight,
      fontStyle: targetStyle.fontStyle,
      letterSpacing: targetStyle.letterSpacing === "normal" ? "0px" : targetStyle.letterSpacing
    });

    source.classList.add("title-journey-hidden");
    target.classList.add("title-journey-hidden");
    document.body.append(moving);

    const animation = moving.animate(
      [textFrame(sourceRect, sourceStyle), textFrame(targetRect, targetStyle)],
      {
        duration,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "both"
      }
    );

    try { await animation.finished; } catch (_) {}

    if (keepAtEnd) {
      animation.cancel();
      Object.assign(moving.style, textFrame(targetRect, targetStyle));
      return {
        moving,
        release() {
          moving.remove();
          source.classList.remove("title-journey-hidden");
          target.classList.remove("title-journey-hidden");
        }
      };
    }

    animation.cancel();
    moving.remove();
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

  async function fadeOverlayAway(overlay, heldTitle) {
    const fade = overlay.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 420, easing: "ease-out", fill: "both" }
    );
    try { await fade.finished; } catch (_) {}

    // Swap the animated word for the real title only once the destination
    // page underneath is completely visible.
    heldTitle?.release();
    fade.cancel();
    overlay.remove();
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

        // Phase 1: current title returns to the exact menu label box.
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
        scrollTo({ top: 0, behavior: "instant" });
        return;
      }

      /*
        Crucial difference from the previous version:
        put the destination main into the REAL document before measuring it.
        That guarantees that the home title is measured in its final grid,
        viewport and footer geometry, not inside the temporary overlay.
      */
      destinationMain.style.opacity = "0";
      currentMain.replaceWith(destinationMain);
      document.body.dataset.page = targetSection;
      scrollTo({ top: 0, behavior: "instant" });

      // The homepage title is vertically centred together with its image.
      // Wait for that image to decode so the measured title position cannot
      // shift after the animation has already started.
      await prepareMedia(destinationMain);

      const destinationTitle = destinationMain.querySelector(".page-title");
      const targetMenuNow = document.querySelector('[data-section="' + targetSection + '"]');
      if (!targetMenuNow || !destinationTitle) throw new Error("Missing title target");

      // Phase 2: chosen menu label expands to the title's exact FINAL box.
      heldTitle = await runTitleZoom({
        source: targetMenuNow,
        target: destinationTitle,
        duration: 1100,
        keepAtEnd: true
      });

      // The real destination is already in its final position underneath.
      destinationMain.style.opacity = "1";
      await fadeOverlayAway(overlay, heldTitle);
      heldTitle = null;
      overlay = null;

      destinationMain.style.removeProperty("opacity");
      if (push) history.pushState({ section: targetSection }, "", href);
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

      const main = document.importNode(incoming, true);
      currentMain.replaceWith(main);
      document.title = doc.title;
      document.body.dataset.page = section;
      scrollTo({ top: 0, behavior: "instant" });
      await prepareMedia(main);
    } catch (_) {
      location.reload();
    }
  });

  // Warm likely destinations so there is no pause between the two zoom phases.
  document.querySelectorAll("a[href][data-section]").forEach((link) => {
    const warm = () => loadPage(link.href).catch(() => {});
    link.addEventListener("mouseenter", warm, { once: true });
    link.addEventListener("focus", warm, { once: true });
  });
})();