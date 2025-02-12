function showDialogue(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (dialog) {
    dialog.showModal();
  }
}

function closeDialogue(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (dialog) {
    dialog.close();
  }
}
