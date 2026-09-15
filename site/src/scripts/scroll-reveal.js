// two independent scroll signals:
//   --progress  total page-scroll, drives the slow drift of the cascade
//   --r1/2/3    staggered reveal of the three lifted records, anchored to
//               the "How it works" section entering view
var boxes = document.querySelectorAll(".visual-box, .mviz");
var anchor = document.getElementById("how-it-works");
var ticking = false;

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// how far a given element has travelled up the viewport, 0 → 1
function revealFor(el) {
  if (!el) return 0;
  var vh = window.innerHeight;
  return clamp01((vh - el.getBoundingClientRect().top) / (vh * 0.7));
}

function update() {
  var max = document.documentElement.scrollHeight - window.innerHeight;
  var progress = max > 0 ? clamp01(window.scrollY / max) : 0;

  // the sticky desktop graphic keys off the "How it works" heading; each
  // mobile act keys off its own position, since it scrolls past on its own
  var stickyReveal = revealFor(anchor);

  boxes.forEach(function (el) {
    var reveal = el.classList.contains("mviz")
      ? revealFor(el)
      : stickyReveal;
    el.style.setProperty("--progress", progress);
    el.style.setProperty("--r1", clamp01(reveal * 2.6));
    el.style.setProperty("--r2", clamp01((reveal - 0.22) * 2.6));
    el.style.setProperty("--r3", clamp01((reveal - 0.44) * 2.6));
    // act 1's waterfall is a CSS animation, held paused until it is on screen
    if (reveal > 0.12) el.classList.add("in-view");
  });
  ticking = false;
}

function onScroll() {
  if (!ticking) {
    window.requestAnimationFrame(update);
    ticking = true;
  }
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // no scroll-linked motion: show the finished composition outright
  boxes.forEach(function (el) {
    el.classList.add("in-view");
    el.style.setProperty("--progress", 0);
    el.style.setProperty("--r1", 1);
    el.style.setProperty("--r2", 1);
    el.style.setProperty("--r3", 1);
  });
} else {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
