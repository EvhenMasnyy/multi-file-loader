import React from "react";
import { useUploadFiles } from "./useUploadFiles";

const FileUploader = () => {
  const {
    files,
    onChange,
    cancelLoading,
    resumeLoading,
    retryFileUpload,
    clearFile,
  } = useUploadFiles();

  return (
    <div>
      <label htmlFor="file-uploader">
        Upload
        <input
          multiple
          onChange={onChange}
          id="file-uploader"
          type="file"
          accept="video/*"
          style={{ display: "none" }}
        />
      </label>
      <div>
        {files.map((file, index) => (
          <div key={index} className="file-details">
            <p>
              <span className="file-name">{file.name}</span>
              <span className={`file-status ${file.status}`}>
                {file.status}
              </span>
            </p>
            <div
              className={`progress-bar`}
              style={{
                width: `${file.percentage}%`,
                height: 2,
                background: "green",
              }}
            />
            <div>
              <button
                type="button"
                className="pause-btn"
                onClick={() => cancelLoading(file)}
              >
                Pause
              </button>
              <button
                type="button"
                className="resume-btn"
                onClick={() => resumeLoading(file)}
              >
                Resume
              </button>
              <button
                type="button"
                className="retryFileUpload-btn"
                onClick={() => retryFileUpload(file)}
              >
                Retry
              </button>
              <button
                type="button"
                className="clean-btn"
                onClick={() => clearFile(file)}
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploader;
