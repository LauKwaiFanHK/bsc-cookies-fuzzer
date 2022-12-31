import FuzzTestStarter from "./FuzzTestStarter.js";
import FuzzTestLogger from "./Logger/FuzzTestLogger.js";

function displayFuzzingErrorsFilePath(fuzzingData) {
  if (fuzzingData.fuzzingErrorsFileName !== undefined) {
    FuzzTestLogger.info(
      "Fuzzing errors were saved. Navigate to the following path for details:"
    );
    console.log(fuzzingData.fuzzingErrorsFileName);
  }
}

function displayFuzzingResultsFilePath(fuzzingData) {
  if (fuzzingData.fuzzingResultsFileName !== undefined) {
    FuzzTestLogger.info(
      "Fuzzing results were saved. Navigate to the following path for details:"
    );
    console.log(fuzzingData.fuzzingResultsFileName);
  }
}

export async function startFuzzing(preTestData, username, password, timestamp, apiData) {
  if (preTestData.resultsSet !== undefined) {
    /* console.log("---");
    console.log(preTestData.cookiesForFuzzing); */
    const fuzzingData = await FuzzTestStarter(
      preTestData.resultsSet,
      username,
      password,
      preTestData.cookiesForFuzzing,
      timestamp,
      apiData
    );
    displayFuzzingErrorsFilePath(fuzzingData);
    displayFuzzingResultsFilePath(fuzzingData);
    return fuzzingData;
  }
}
