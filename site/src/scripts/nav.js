// Mobile nav disclosure.
var nav = document.querySelector(".nav");
var btn = nav.querySelector(".nav-toggle");

function setOpen(open) {
  nav.dataset.open = open ? "true" : "false";
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}

btn.addEventListener("click", function () {
  setOpen(nav.dataset.open !== "true");
});

// jumping to a section should close the menu behind it
nav.querySelectorAll(".nav-links a").forEach(function (a) {
  a.addEventListener("click", function () {
    setOpen(false);
  });
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") setOpen(false);
});

// reset when the layout crosses back above the mobile breakpoint
window
  .matchMedia("(min-width: 761px)")
  .addEventListener("change", function (e) {
    if (e.matches) setOpen(false);
  });
