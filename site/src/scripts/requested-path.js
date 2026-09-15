// Shows the address that missed, on /404. Reaching the page directly is not a
// miss, and there is nothing to show.
var path = window.location.pathname || "/";

if (path !== "/404" && path !== "/404/" && path !== "/404.html") {
  var chip = document.querySelector(".path-chip");
  var slot = document.getElementById("requested-path");

  if (chip && slot) {
    slot.textContent = path;
    chip.hidden = false;
  }
}
