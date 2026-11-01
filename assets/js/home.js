/* Home page — greeting, live clock and the tool grids. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  var el = function (id) {
    return document.getElementById(id);
  };

  function renderClock() {
    var now = new Date();
    var hour = now.getHours();

    el("greeting").textContent = ST.greeting(hour);
    el("heroDate").textContent =
      DOW[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear();

    el("chipTime").innerHTML =
      "<strong>" + ST.pad2(hour) + ":" + ST.pad2(now.getMinutes()) + ":" +
      ST.pad2(now.getSeconds()) + "</strong> local";

    el("chipMonth").innerHTML =
      "Month <strong>" + (now.getMonth() + 1) + "</strong> · " + MONTHS[now.getMonth()];

    el("chipDay").innerHTML =
      "Day <strong>" + ST.dayOfYear(now) + "</strong> of " + now.getFullYear();

    el("chipWeek").innerHTML = "Week <strong>" + ST.isoWeek(now) + "</strong>";
  }

  function starButton(tool) {
    var favs = ST.getFavs();
    var on = favs.indexOf(tool.id) >= 0;
    return (
      '<button class="star" type="button" data-id="' + tool.id + '"' +
      ' aria-pressed="' + on + '"' +
      ' aria-label="' + (on ? "Remove from favourites: " : "Add to favourites: ") + tool.name + '"' +
      ">" + ST.icon("star") + "</button>"
    );
  }

  function card(tool) {
    return (
      '<article class="tool">' +
      '<div class="tool-icon">' + ST.icon(tool.icon) + "</div>" +
      '<a class="tool-name" href="' + tool.href + '">' + tool.name + "</a>" +
      '<p class="tool-desc">' + tool.desc + "</p>" +
      starButton(tool) +
      "</article>"
    );
  }

  function renderGrids() {
    var favs = ST.getFavs();
    var favTools = favs
      .map(function (id) {
        return ST.TOOLS.filter(function (t) {
          return t.id === id;
        })[0];
      })
      .filter(Boolean);

    el("favGrid").innerHTML = favTools.map(card).join("");
    el("favEmpty").hidden = favTools.length > 0;
    el("favGrid").hidden = favTools.length === 0;
    el("toolGrid").innerHTML = ST.TOOLS.map(card).join("");
  }

  document.addEventListener("click", function (e) {
    var star = e.target.closest(".star");
    if (!star) return;
    e.preventDefault();
    e.stopPropagation();

    var id = star.getAttribute("data-id");
    var wasFav = ST.getFavs().indexOf(id) >= 0;
    var after = ST.toggleFav(id);
    var isFav = after.indexOf(id) >= 0;

    if (isFav !== wasFav) {
      ST.toast(isFav ? "Added to favourites" : "Removed from favourites");
    }
    renderGrids();
  });

  renderClock();
  renderGrids();
  setInterval(renderClock, 1000);
})();
