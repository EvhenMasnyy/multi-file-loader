import express from "express";
import fs from "fs";
import { promisify } from "util";
import busboy from "busboy";
import cors from "cors";

const getFileDetails = promisify(fs.stat);

const uniqueIncrementingId = ((lastId = 0) => {
  const id = function* () {
    let numb = lastId;
    while (true) {
      yield (numb += 1);
    }
  };

  return (length = 12) => `${id().next().value}`.padStart(length, "0");
})();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/upload", (req, res) => {
  const contentRange = req.headers["content-range"];
  const fileId = req.headers["x-file-id"];

  if (!contentRange) {
    return res.json({ message: 'Missing "Content-Range" Header' });
  }
  if (!fileId) {
    return res.json({ message: 'Missing "X-File-Id" Header' });
  }

  const match = contentRange.match(/bytes=(\d+)-(\d+)\/(\d+)/);
  if (!match) {
    return res.json({ message: 'Invalid "Content-Range" provided' });
  }

  const rangeStart = +match[1];
  const rangeEnd = +match[2];
  const fileSize = +match[3];

  if (rangeStart >= fileSize || rangeStart >= rangeEnd || rangeEnd > fileSize) {
    return res.json({ message: 'Invalid "Content-Range" provided' });
  }

  const busBoy = busboy({ headers: req.headers });

  busBoy.on("error", (err) => {
    console.log("Failed to read file", err);
    res.sendStatus(500);
  });

  busBoy.on("close", () => {
    res.setHeader("Connection", "close");
    res.sendStatus(200);
  });

  busBoy.on("file", (_, file, info) => {
    const filePath = getFilePath(info.filename, fileId);
    getFileDetails(filePath)
      .then((stats) => {
        if (stats.size !== rangeStart) {
          console.log("Error stat range start", stats.size, rangeStart);
          res.status(400).json({ message: "Bad chunk range start" });
          return;
        }
        file.pipe(fs.createWriteStream(filePath, { flags: "a" }));
      })
      .catch((e) => {
        console.error("failed to read file", e);
        res.status(400).json({
          message: "No file with provided credentials",
          credentials: {
            fileId,
            fileName: info.filename,
          },
        });
      });
  });

  req.pipe(busBoy);
});

app.get("/upload-status", (req, res) => {
  if (req.query && req.query.fileId && req.query.fileName) {
    getFileDetails(getFilePath(req.query.fileName, req.query.fileId))
      .then((stats) => {
        res.status(200).json({ totalChunkUploaded: stats.size });
      })
      .catch((err) => {
        console.log("failed to read file", err);
        res.status(400).json({
          message: "No file with provided credentials",
          credentials: { ...req.query },
        });
      });
  } else {
    return res.status(400).json({
      message: "No file with provided credentials",
      credentials: { ...req.query },
    });
  }
});

const getFilePath = (fileName, id) => `./uploads/file-${id}-${fileName}`;

app.post("/upload-request", (req, res) => {
  if (!req.body || !req.body.fileName) {
    res.sendStatus(400).json({ message: 'Missing "fileName"' });
  } else {
    const fileId = uniqueIncrementingId();
    const fileName = req.body.fileName;

    fs.createWriteStream(getFilePath(fileName, fileId), {
      flags: "w",
    });

    res.status(200).json({ fileId, fileName });
  }
});

app.listen(3005, () => {
  console.log("Server is listened on http://localhost:3005");
});
