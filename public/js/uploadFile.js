document.addEventListener("DOMContentLoaded", async () => {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file");
  const fileList = document.getElementById("upload-file-list");
  const uploadForm = document.getElementById("uploadForm");
  const parentFolderId = uploadForm.querySelector(
    "input[name='parentFolderId']"
  ).value;
  const uploadBtn = document.getElementById("upload-file-button");
  const uploadFileDialogClose = document.getElementById(
    "upload-file-dialog-close"
  );
  const uploadFileDoneButton = document.getElementById(
    "upload-file-done-button"
  );

  let files = [];
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const maxFileCount = 5;
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
      if (file.size > maxFileSize) {
        alert("File size exceeds the maximum limit of 5MB.");
        return;
      }
      if (files.length >= maxFileCount) {
        alert("You can only upload up to 5 files.");
        return;
      }
      files.push(file);
      displayFile(file);
    });
  }

  // display file in the list
  function displayFile(file) {
    const listItem = document.createElement("li");
    listItem.classList.add("file-item");
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
        <span class="status pending"></span>
        <div class="progress-container mr-1">
            <div class="progress-bar "></div>
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
    removeBtn.classList.add("remove-file-btn");
    removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    removeBtn.onclick = () => {
      files = files.filter((f) => f !== file);
      listItem.remove();
    };

    listItem.appendChild(removeBtn);
    console.log(file.type);
    fileList.appendChild(listItem);
  }

  uploadFileDialogClose.addEventListener("click", () => {
    fileList.innerHTML = "";
    files = [];
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
    uploadBtn.classList.remove("hidden");
    uploadFileDoneButton.classList.add("hidden");
    uploadFileDoneButton.onclick = null;
  });

  // upload files

  uploadForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    files.forEach(async (file, index) => {
      await uploadFiles(file, index);
    });

    uploadFileDoneButton.classList.remove("hidden");

    uploadFileDoneButton.onclick = () => {
      fileList.innerHTML = "";
      files = [];
      window.location.reload();
    };

    // const formData = new FormData();
    // files.forEach((file) => formData.append("file", file));
    // formData.append("parentFolderId", parentFolderId);

    // const xhr = new XMLHttpRequest();
    // xhr.open("POST", "/app/upload", true);

    // xhr.upload.onprogress = (e) => {
    //   if (e.lengthComputable) {
    //     const progressPercentage = (e.loaded / e.total) * 100;
    //     document.querySelectorAll(".progress-bar").forEach((progressBar) => {
    //       progressBar.style.width = `${progressPercentage}%`;
    //     });
    //   }
    // };

    // xhr.onload = () => {
    //   if (xhr.status === 200) {
    //     alert("Upload complete!");
    //     fileList.innerHTML = "";
    //     files = [];
    //   } else {
    //     alert("Upload failed!");
    //   }
    // };

    // xhr.send(formData);
  });

  async function uploadFiles(file, index) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("parentFolderId", parentFolderId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/app/upload", true);

    const listItem = document.querySelectorAll(".file-item")[index];
    let status = listItem.querySelector(".status");
    status.classList.remove("pending");
    const progressBar = listItem.querySelector(".progress-bar");

    status.classList.add("uploading");

    xhr.onload = () => {
      if (xhr.status === 200) {
        status.classList.remove("uploading");
        status.classList.add("completed");
        progressBar.classList.remove("uploading");
        progressBar.classList.add("completed");
        uploadBtn.textContent = "Done";
        uploadBtn.disabled = false;
        // remove the uploadBtn
        uploadBtn.classList.add("hidden");
      } else {
        status.classList.remove("uploading");
        status.classList.add("error");
        progressBar.classList.add("error");
        alert("Upload failed!");
      }
    };

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progressPercentage = (e.loaded / e.total) * 100;
        document.querySelectorAll(".progress-bar").forEach((progressBar) => {
          progressBar.style.width = `${progressPercentage}%`;
        });
        progressBar.classList.remove("error");
        progressBar.classList.remove("completed");
        progressBar.classList.remove("pending");
        progressBar.classList.add("uploading");
        status.classList.remove("error");
        status.classList.remove("completed");
        status.classList.add("uploading");
      }
    };

    xhr.onerror = () => {
      status.classList.remove("uploading");
      status.classList.add("error");
      progressBar.classList.add("error");
    };

    xhr.send(formData);
  }
});
