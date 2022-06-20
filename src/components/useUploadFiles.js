import { useRef, useState } from "react";

const defaultOptions = {
  startingByte: 0,
  url: "http://localhost:3005/upload",
};

const FILE_STATUSES = {
  PENDING: "Pending",
  UPLOADING: "Uploading",
  CANCELED: "Canceled",
  PAUSED: "Paused",
  COMPLETED: "completed",
  FAILED: "Failed",
};

export const useUploadFiles = () => {
  const [files, setFiles] = useState({});
  const requests = useRef({}).current;

  const onprogress = (e, file) => {
    setFiles((prev) => ({
      ...prev,
      [file.name]: {
        ...prev[file.name],
        status: FILE_STATUSES.UPLOADING,
        percentage: (e.loaded * 100) / e.total,
      },
    }));
  };

  const onerror = (e, file) => {
    setFiles((prev) => ({
      ...prev,
      [file.name]: {
        ...prev[file.name],
        status: FILE_STATUSES.FAILED,
        percentage: 100,
      },
    }));
  };

  const onabort = (e, file) => {
    setFiles((prev) => ({
      ...prev,
      [file.name]: {
        ...prev[file.name],
        status: FILE_STATUSES.CANCELED,
      },
    }));
  };

  const onload = (e, file) => {
    setFiles((prev) => ({
      ...prev,
      [file.name]: {
        ...prev[file.name],
        status: FILE_STATUSES.COMPLETED,
        percentage: 100,
      },
    }));
  };

  const onChange = (event) => {
    const files = [...event.target.files].reduce((files, file) => {
      files[file.name] = {
        status: FILE_STATUSES.PENDING,
        name: file.name,
        size: file.size,
        percentage: 0,
      };
      return files;
    }, {});

    uploadFiles(event.target.files);
    setFiles(files);
  };

  const cancelLoading = (file) => {
    const canceledFile = requests[file.name];
    if (canceledFile) {
      canceledFile.request.abort();
    }
  };

  const retryFileUpload = (file) => {
    const fileData = requests[file.name];
    if (fileData) {
      cancelLoading(file);
      uploadFileChunks(fileData.file, {
        ...fileData.option,
        ...defaultOptions,
      });
    }
  };

  const clearFile = (file) => {
    cancelLoading(file);
    delete requests[file.name];
    setFiles((prevState) => {
      delete prevState[file.name];
      return { ...prevState };
    });
  };

  const resumeLoading = (file) => {
    const request = requests[file.name];
    fetch(
      `http://localhost:3005/upload-status?fileId=${request.option.fileId}&fileName=${file.name}`
    )
      .then((res) => res.json())
      .then((res) => {
        uploadFileChunks(request.file, {
          ...request.option,
          startingByte: res.totalChunkUploaded,
        });
      });
  };

  const uploadFileChunks = (file, option) => {
    const chunk = file.slice(option.startingByte);

    const formData = new FormData();

    const request = new XMLHttpRequest();
    requests[file.name].request = request;

    formData.append("chunk", chunk, file.name);
    formData.append("fileId", option.fileId);

    request.open("POST", option.url, true);

    request.setRequestHeader("X-File-Id", option.fileId);
    // request.setRequestHeader("Content-Length", chunk.size); set by browser
    request.setRequestHeader(
      "Content-Range",
      `bytes=${option.startingByte}-${option.startingByte + chunk.size}/${
        file.size
      }`
    );

    request.onload = (e) => onload(e, file);

    request.onerror = (e) => onerror(e, file);

    request.onabort = (e) => onabort(e, file);

    request.upload.onprogress = (e) => {
      const loaded = option.startingByte + e.loaded;
      onprogress({ ...e, loaded, total: file.size }, file);
    };

    request.send(formData);
  };

  const uploadFile = (file, option) => {
    fetch("http://localhost:3005/upload-request", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => {
        option = { ...option, fileId: res.fileId };
        requests[file.name] = { request: null, option, file };
        uploadFileChunks(file, option);
      });
  };

  const uploadFiles = (files, options = defaultOptions) => {
    [...files].forEach((file) =>
      uploadFile(file, { ...defaultOptions, ...options })
    );
  };

  return {
    files: Object.values(files),
    onChange,
    cancelLoading,
    resumeLoading,
    retryFileUpload,
    clearFile,
  };
};
