import fs from "fs";
import beautify from "js-beautify";

export default class ResultWriter {
  constructor(resultFileName, timestamp) {
    this.resultPath = `Results/${timestamp}/${resultFileName}`;
  }

  getResultPath(){
    return this.resultPath;
  }

  async writeResult(data) {
    fs.writeFile(this.resultPath, beautify(JSON.stringify(data, { indent_size: 2, space_in_empty_paren: true })), function (err, fd) {
      if (err) {
        throw err;
      }
    });
  }
}
