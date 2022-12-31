import fs from "fs";

export default class ResultReader {
  constructor(path) {
    this.path = path;
  }

  readFile() {
    fs.readFile(this.path, "utf8", (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(data);
    });
  }
}
