import express from "express";

const app = express();
app.use(express.json);

app.listen(3002, () => {
  console.log("Server is listened on http://localhost:3002");
});
