document.addEventListener("DOMContentLoaded", () => {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file");
  const fileList = document.getElementById("upload-file-list");
  const uploadForm = document.getElementById("uploadForm");

  let files = [];
  // drag and drop functionality
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("active");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("active");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("active");
    handleFiles(e.dataTransfer.files);
  });

  // click to upload
  //   dropzone.addEventListener("click", () => {
  //     fileInput.click();
  //   });

  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
  });

  function handleFiles(selectedFiles) {
    [...selectedFiles].forEach((file) => {
      files.push(file);
      displayFile(file);
    });
  }

  // display file in the list
  function displayFile(file) {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
     <div class="w-full h-fit flex items-center justify-between gap-2">
        <div  data-file-type="${
          file.type
        }" class="file-icon w-fit h-fit flex items-center justify-center gap-2">
        </div>
        <div class="w-full h-fit flex items-center justify-start gap-2">
            <p class="text-gray-900 text-sm font-medium line-clamp-1">${
              file.name
            }</p>
            <p class="text-gray-900 text-sm font-medium line-clamp-1">(${(
              file.size / 1024
            ).toFixed(2)} KB)</p>
        </div>
        
     </div>
    `;
    // listItem.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    const fileIcon = listItem.querySelector(".file-icon");
    if (file.type.includes("image")) {
      fileIcon.innerHTML = `<i class="bi bi-file-earmark-image text-blue-600 text-lg"></i>`;
    } else if (file.type.includes("pdf")) {
      fileIcon.innerHTML = `<i class="bi bi-file-earmark-pdf text-red-600 text-lg"></i>`;
    } else if (file.type.includes("spreadsheetml")) {
      fileIcon.innerHTML = `<i class="bi bi-file-earmark-excel text-green-600 text-lg"></i>`;
    } else if (file.type.includes("presentationml")) {
      fileIcon.innerHTML = `<i class="bi bi-file-earmark-ppt text-yellow-600 text-lg"></i>`;
    } else if (file.type.includes("doc")) {
      fileIcon.innerHTML = `<i class="bi bi-file-earmark-word text-blue-600 text-lg"></i>`;
    }
    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    removeBtn.onclick = () => {
      files = files.filter((f) => f !== file);
      listItem.remove();
    };

    listItem.appendChild(removeBtn);
    console.log(file.type);
    fileList.appendChild(listItem);
  }

  uploadForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/app/upload", true);

    xhr.onload = () => {
      if (xhr.status === 200) {
        alert("Upload complete!");
        fileList.innerHTML = "";
        files = [];
      } else {
        alert("Upload failed!");
      }
    };

    xhr.send(formData);
  });
});
