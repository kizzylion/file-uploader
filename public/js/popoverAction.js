function toggleMenu(id) {
  const menu = document.getElementById(id);
  if (menu.open) {
    menu.close();
  } else {
    menu.show();
  }
}

// Optional: Hide menu when an item is clicked
document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.getElementById("file-1-menu").close();
  });
});

// close menu when click outside
document.addEventListener("click", (event) => {
  const popovers = document.querySelectorAll(".popover");
  const popoverTriggers = document.querySelectorAll(".popover-trigger");
  popovers.forEach((popover, index) => {
    if (
      !popover.contains(event.target) &&
      popover.open &&
      !popoverTriggers[index].contains(event.target)
    ) {
      popover.close();
    }
  });
});
