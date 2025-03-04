function copyToClipboard() {
  const inputField = document.getElementById("linkInput");
  inputField.select();
  inputField.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(inputField.value);
  alert("Copied to clipboard!");
}
const forms = document.querySelectorAll(".uploadForm");

forms.forEach((form, index) => {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    const folderIdentity = formData.get("folderIdentity");
    const duration = formData.get("duration");
    const customDays = formData.get("custom-days");
    const data = { folderIdentity, duration, customDays };

    if (!folderIdentity) {
      alert("Folder ID is missing. Please try again.");
      return;
    }

    const link = `/app/folder/${folderIdentity}/share`;

    try {
      const response = await fetch(link, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Specify JSON format
        },
        body: JSON.stringify(data), // Convert object to JSON string
      });

      let result;
      try {
        result = await response.json();
      } catch (err) {
        alert("Invalid server response.");
        return;
      }

      if (!response.ok) {
        alert(result?.error || "Error generating share link.");
        return;
      }

      const shareLinkContainer = document.querySelector(
        `#folder-${folderIdentity}-info .share-link-container`
      );

      if (shareLinkContainer) {
        shareLinkContainer.innerHTML = `
                    <div class="share-link mt-1 py-2 pb-4">
                        <h4 class="text-sm mb-2 font-semibold">Share Link:</h4>
                        <div class="copy-container w-full flex justify-between items-center w-fit border-2 border-gray-400 bg-white gap-1 rounded-lg overflow-hidden">
                            <input class="w-full pl-2 py-1 bg-white border-transparent text-sm" type="text" id="linkInput" value="${result.shareUrl}" disabled>
                            <button type="button" class=" bg-gray-200 flex size-8 justify-center items-center border-l border-gray-400" onclick="copyToClipboard()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                                </svg>
                            </button>
                        </div>
                        <p class="text-xs mt-2"><a href="${result.shareUrl}" target="_blank" class="text-blue-600 underline">This link</a> will expire on <span class="text-red-900 font-semibold">${result.expirationDate}</span>.</p>
                    </div>
                `;
      } else {
        alert("Share link container not found.");
      }
    } catch (error) {
      alert("Failed to create share link.");
    }
  });

  form.querySelectorAll('input[name="duration"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const customDuration = forms[index].querySelector("#custom-duration");
      const customDaysInput = forms[index].querySelector("#custom-days");

      if (event.target.value === "custom") {
        customDuration.style.display = "block";
        customDaysInput.required = true;
      } else {
        customDuration.style.display = "none";
        customDaysInput.required = false;
      }
    });
  });
});
