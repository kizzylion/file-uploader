function toggleMenu(id) {
  const menu = document.getElementById(id);
  // Toggle display; alternatively, you could add/remove a class
  if (menu.style.display === "block") {
    menu.style.display = "none";
  } else {
    menu.style.display = "block";
  }
}

// Optional: Hide menu when an item is clicked
document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.getElementById("cardMenu").style.display = "none";
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".file-card-action-dropdown-menu")) {
    document.getElementById("file-card-action-dropdown-menu").style.display =
      "none";
  }
});
