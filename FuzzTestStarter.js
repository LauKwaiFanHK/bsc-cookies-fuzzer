import fs from "fs";
import FuzzTestLogger from "./Logger/FuzzTestLogger.js";
import AxiosCallGenerator from "./AxiosCallGenerator.js";
import FuzzTestGenerator from "./FuzzTestGenerator.js";
import { CookiesGenerator } from "./CookiesGenerator.js";
import ResultWriter from "./ResultWriter.js";
import {
  findRequestSequences,
  extractCookieNameValuePair,
  convertSetToObjectArray,
  extractAllParsedCookies,
  extractCookiesHeaderSample,
  reassembleCookie,
  truncateLongCookie,
} from "./HelperFunctions.js";
import { detectFuzzTestError } from "./ErrorDetection.js";
import Queue from "./Queue.js";
import { checkCookiesAttributes } from "./CookiesAttributesChecker.js";

export default async function FuzzTestStarter(
  resultsSet,
  username,
  pw,
  cookiesForFuzzing,
  timestamp,
  apiData
) {
  // Put the array of request sequences to a queue instance.
  if (resultsSet.length > 0) {
    const fuzzTestsQueue = new Queue();
    let requestSequences = [];
    requestSequences = findRequestSequences(resultsSet);
    for (let x of requestSequences) {
      fuzzTestsQueue.enqueue(x);
    }

    // Next, send request to each endpoint with each name-value pair in a Cookie header.
    // Also, fuzz each name and each value.

    // Send request sequentially together with a specified cookies fuzzed value.
    const myAxios_fuzz = new AxiosCallGenerator();
    const myFuzzer = new FuzzTestGenerator();
    let allNameValuePairs = extractCookieNameValuePair(cookiesForFuzzing);
    
    allNameValuePairs = CookiesGenerator(allNameValuePairs);
    // Pass one extracted cookies name value pair at one time of requesting along the sequence
    let allFuzzingResults = [];
    let totalErrorArr = [];
    let totalOtherErrorArr = [];
    let allErrorRequestSequences = [];
    let allOtherErrorSequence = [];
    FuzzTestLogger.info(`Start fuzzing...`);
    for (let x of allNameValuePairs) {
      let localTotalErrorArr = [];
      FuzzTestLogger.info(
        `Fuzzing with cookie input: ${truncateLongCookie(x)}` // 
      );
      let errorArr = [];
      const fuzzingResults = await myFuzzer.runRequestSequence(
        myAxios_fuzz,
        requestSequences,
        x,
        username,
        pw
      );
      allFuzzingResults.push(fuzzingResults);
      // Detect implementation errors
      errorArr = detectFuzzTestError(fuzzingResults, apiData);
      const newErrorObj = { cookie: x, errorResponse: errorArr.serverErrorArr };
      const newErrorRequestSequence = {
        cookie: x,
        errorRequestSequence: errorArr.serverErrorRequestSequence,
      };
      const newOtherErrorObj = { cookie: x, errorResponse: errorArr.otherErrorArr };
      const newOtherErrorRequestSequence = {
        cookie: x,
        errorRequestSequence: errorArr.otherErrorRequestSequence,
      };
      totalErrorArr.push(newErrorObj);
      totalOtherErrorArr.push(newOtherErrorObj);
      allErrorRequestSequences.push(newErrorRequestSequence);
      allOtherErrorSequence.push(newOtherErrorRequestSequence);
      localTotalErrorArr.push(newErrorObj); // Report errors of each fuzzed cookies
      if (errorArr.serverErrorArr.length > 0) {
        FuzzTestLogger.error(
          `Detected ${errorArr.serverErrorArr.length} implementation errors.`
        );
        // Distill errors to single root cause
        for (let x of localTotalErrorArr) {
          let distilledErrorSet = new Set();
          const cookie = x["cookie"];
          const errorResponse = x["errorResponse"];
          if (errorResponse.length > 0) {
            for (let x of errorResponse) {
              //console.log(x);
              const resMethod = x["errorResponse"]["method"];
              const resRequestedUrl = x["errorResponse"]["requestedUrl"];
              const resStatusCode = x["errorResponse"]["statusCode"];
              const resMessage = x["errorResponse"]["responseMessage"];
              const distilledError = {
                cookie: truncateLongCookie(cookie),
                resMethod: resMethod,
                resRequestedUrl: resRequestedUrl,
                resStatusCode: resStatusCode,
                resMessage: resMessage,
              };
              distilledErrorSet.add(JSON.stringify(distilledError));
            }
          }
          if (distilledErrorSet.size > 0) {
            FuzzTestLogger.error(`Error(s) caused by:`);
            const parsedErrorArray = convertSetToObjectArray(distilledErrorSet);
            console.table(parsedErrorArray);
          }
        }
      } else {
        FuzzTestLogger.success(x + ": No implementation errors are detected");
      }

      // Detect cookies misconfiguration
      const returnedCookiesHeaders = extractAllParsedCookies(fuzzingResults);
      //console.log(returnedCookiesData);
      let allCookieNameValues = new Set();
      if (returnedCookiesHeaders.length > 0) {
        const nameValuePairs = extractCookieNameValuePair(
          returnedCookiesHeaders
        );
        for (let x of nameValuePairs) {
          allCookieNameValues.add(x);
        }
        const allCookieNameValuesArr = Array.from(allCookieNameValues);
        const headerSet = extractCookiesHeaderSample(
          returnedCookiesHeaders,
          allCookieNameValuesArr
        );
        FuzzTestLogger.info(
          `Found ${headerSet.length} returned cookies headers:`
        );
        if (headerSet.length > 0) {
          for (let x of headerSet) {
            FuzzTestLogger.info(reassembleCookie(x));
          }
          checkCookiesAttributes(headerSet, FuzzTestLogger);
        } else {
          FuzzTestLogger.success(
            "Found no returned cookies headers. Detected no cookies misconfiguration."
          );
        }
      }
    }

    fs.mkdirSync(`Results/${timestamp}/2_Fuzzing`);
    // Write all request traffic to Results folder
    const fuzzingResultsFileName = "2_Fuzzing/FuzzingRequestsResult.json";
    const fuzzingResultsWriter = new ResultWriter(
      fuzzingResultsFileName,
      timestamp
    );
    await fuzzingResultsWriter.writeResult(allFuzzingResults);

    // Write all captured 500 errors to Result/Fuzzing folder
    const fuzzingErrorsFileName = "2_Fuzzing/allServerErrors.json";
    const fuzzingErrorsWriter = new ResultWriter(
      fuzzingErrorsFileName,
      timestamp
    );
    await fuzzingErrorsWriter.writeResult(totalErrorArr);

    const fuzzingOtherErrorsFileName = "2_Fuzzing/allOtherErrors.json";
    const fuzzingOtherErrorsWriter = new ResultWriter(
      fuzzingOtherErrorsFileName,
      timestamp
    );
    await fuzzingOtherErrorsWriter.writeResult(totalOtherErrorArr);

    return {
      fuzzingErrorsFileName: fuzzingErrorsWriter.getResultPath(),
      fuzzingResultsFileName: fuzzingResultsWriter.getResultPath(),
      fuzzingOtherErrorsFileName: fuzzingOtherErrorsWriter.getResultPath(),
      allErrorRequestSequences: allErrorRequestSequences,
    };
  }
}
