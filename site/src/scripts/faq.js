// FAQ accordion.
document.querySelectorAll(".faq-item").forEach(function (item) {
  var btn = item.querySelector(".faq-q");
  btn.addEventListener("click", function () {
    var open = item.dataset.open === "true";
    item.dataset.open = open ? "false" : "true";
    btn.setAttribute("aria-expanded", open ? "false" : "true");
  });
});
