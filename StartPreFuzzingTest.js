import PreTestGenerator from "./PreTestGenerator.js";
import PreTestLogger from "./Logger/PreTestLogger.js";

function displayPreTestResultFilePath(preTestData) {
  if (preTestData.preTestResultFileName !== undefined) {
    PreTestLogger.info(
      "Pre-fuzzing test result was saved. Navigate to the following path for details:"
    );
    console.log(preTestData.preTestResultFileName);
  }
}

function displayPreTestServerErrorFilePath(preTestData) {
  if (preTestData.preTestErrorsFileName !== undefined) {
    PreTestLogger.info(
      "Disocvered server errors were saved. Navigate to the following path for details:"
    );
    console.log(preTestData.preTestErrorsFileName);
  }
}

function displayPreTestOtherErrorFilePath(preTestData) {
  if (preTestData.preTestOtherErrorsFileName !== undefined) {
    PreTestLogger.info(
      "Other errors were found and saved. Navigate to the following path for details:"
    );
    console.log(preTestData.preTestOtherErrorsFileName);
  }
}

export async function startPreFuzzingTest(apiData, username, pw, timestamp) {
  console.log("------Pre-fuzzing test result------");
  const preTestData = await PreTestGenerator(apiData, username, pw, timestamp);
  displayPreTestResultFilePath(preTestData);
  displayPreTestServerErrorFilePath(preTestData);
  displayPreTestOtherErrorFilePath(preTestData);
  return preTestData;
}
