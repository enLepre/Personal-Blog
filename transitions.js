(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cache = new Map();
  let running = false;

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const sectionFromPath = (pathname) => {
    const file = pathname.split("/").pop() || "index.html";
    if (file === "research.html") return "research";
    if (file === "notes.html") return "notes";
    if (file === "essays.html") return "essays";
    if (file === "about.html") return "about";
    return "home";
  };

  const fetchPage = async (url) => {
    const key = new URL(url, window.location.href).href;
    if (cache.has(key)) return cache.get(key);
    const promise = fetch(key, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("Page fetch failed: " + response.status);
        return response.text();
      })
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    cache.set(key, promise);
    return promise;
  };

  const rectStyle = (el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      rect,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight === "normal" ? cs.fontSize : cs.lineHeight,
      letterSpacing: cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing,
      color: cs.color
    };
  };

  const createMovingWord = (text, source) => {
    const s = rectStyle(source);
    const word = document.createElement("div");
    word.className = "transition-word";
    word.textContent = text;
    Object.assign(word.style, {
      left: s.rect.left + "px",
      top: s.rect.top + "px",
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      fontStyle: s.fontStyle,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      color: s.color
    });
    document.body.appendChild(word);
    return word;
  };

  const morph = async (text, fromEl, toEl, duration) => {
    if (!fromEl || !toEl) return;
    const start = rectStyle(fromEl);
    const end = rectStyle(toEl);
    const word = createMovingWord(text, fromEl);

    fromEl.classList.add("is-transition-hidden");
    toEl.classList.add("is-transition-hidden");

    const animation = word.animate([
      {
        left: start.rect.left + "px",
        top: start.rect.top + "px",
        fontSize: start.fontSize,
        lineHeight: start.lineHeight,
        letterSpacing: start.letterSpacing
      },
      {
        left: end.rect.left + "px",
        top: end.rect.top + "px",
        fontSize: end.fontSize,
        lineHeight: end.lineHeight,
        letterSpacing: end.letterSpacing
      }
    ], {
      duration,
      easing: "cubic-bezier(.22,.72,.22,1)",
      fill: "forwards"
    });

    try { await animation.finished; } catch (_) {}

    word.remove();
    fromEl.classList.remove("is-transition-hidden");
    toEl.classList.remove("is-transition-hidden");
  };

  const fadeOut = async (el, duration = 220) => {
    if (!el) return;
    const a = el.animate([{opacity:1},{opacity:0}], {
      duration,
      easing:"ease",
      fill:"forwards"
    });
    try { await a.finished; } catch (_) {}
  };

  const fadeIn = async (el, duration = 300) => {
    if (!el) return;
    el.style.opacity = "0";
    const a = el.animate([{opacity:0},{opacity:1}], {
      duration,
      easing:"ease",
      fill:"forwards"
    });
    try { await a.finished; } catch (_) {}
    el.style.opacity = "";
  };

  const replaceMain = (doc, targetSection) => {
    const incoming = doc.querySelector("main");
    const current = document.querySelector("main");
    if (!incoming || !current) throw new Error("Missing main element");

    const clone = document.importNode(incoming, true);
    current.replaceWith(clone);
    document.title = doc.title;
    document.body.dataset.page = targetSection;
    window.scrollTo(0, 0);
    return clone;
  };

  const navigate = async (url, targetSection, {push = true, animate = true} = {}) => {
    if (running) return;
    running = true;
    document.body.classList.add("is-page-transitioning");

    try {
      const currentSection = document.body.dataset.page || "home";
      const currentTitle = document.querySelector(".page-title");
      const currentMenu = document.querySelector('[data-section="' + currentSection + '"]');
      const clickedMenu = document.querySelector('[data-section="' + targetSection + '"]');

      const nextDocPromise = fetchPage(url);

      if (animate && !reduceMotion.matches && currentTitle && currentMenu) {
        await morph(currentTitle.textContent.trim(), currentTitle, currentMenu, 720);
      }

      const oldContent = document.querySelector(".page-content");
      if (animate && !reduceMotion.matches) {
        await fadeOut(oldContent, 220);
      }

      const nextDoc = await nextDocPromise;
      const newMain = replaceMain(nextDoc, targetSection);
      const newTitle = newMain.querySelector(".page-title");
      const newContent = newMain.querySelector(".page-content");
      if (newContent) newContent.style.opacity = "0";

      if (push) history.pushState({section:targetSection}, "", url);

      const targetMenuNow = document.querySelector('[data-section="' + targetSection + '"]');

      if (animate && !reduceMotion.matches && targetMenuNow && newTitle) {
        await wait(90);
        await morph(targetMenuNow.textContent.trim(), targetMenuNow, newTitle, 980);
        await fadeIn(newContent, 320);
      } else {
        if (newContent) newContent.style.opacity = "";
      }
    } catch (error) {
      console.error(error);
      window.location.href = url;
      return;
    } finally {
      document.body.classList.remove("is-page-transitioning");
      running = false;
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href][data-section]");
    if (!link) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;
    if (link.target && link.target !== "_self") return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const targetSection = link.dataset.section || sectionFromPath(url.pathname);
    const currentSection = document.body.dataset.page || "home";
    if (targetSection === currentSection) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    navigate(url.href, targetSection, {push:true, animate:true});
  });

  window.addEventListener("popstate", () => {
    const section = sectionFromPath(window.location.pathname);
    navigate(window.location.href, section, {push:false, animate:false});
  });

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("a[href][data-section]").forEach((link) => {
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin) {
        const preload = () => fetchPage(url.href).catch(() => {});
        link.addEventListener("mouseenter", preload, {once:true});
        link.addEventListener("focus", preload, {once:true});
      }
    });
  });
})();