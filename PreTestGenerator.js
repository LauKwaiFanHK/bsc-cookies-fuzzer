import fs from "fs";
import RequestDataGenerator from "./RequestDataGenerator.js";
import AxiosCallGenerator from "./AxiosCallGenerator.js";
import PreTestResultWriter from "./ResultWriter.js";
import PreTestLogger from "./Logger/PreTestLogger.js";
import {
  parseCookies,
  destructureCookies,
  extractSetCookiesHeader,
} from "./HelperFunctions.js";
import {
  detectPreTestError,
  detectUncoveredEndpoints,
} from "./ErrorDetection.js";
import { checkCookiesAttributes } from "./CookiesAttributesChecker.js";

export default async function PreTestGenerator(
  apiData,
  usernameInput,
  pwInput,
  timestamp
) {
  if (apiData !== undefined) {
    const myRequestDataGenerator = new RequestDataGenerator(apiData);
    const requestData = myRequestDataGenerator.computeRequestData();
    PreTestLogger.info(
      "Extracted endpoints, methods and expected status codes:"
    );
    console.table(requestData);

    // Send requests to all endpoints to get pre-fuzzing response
    const myAxios = new AxiosCallGenerator();
    let preTestResultCollection = [];
    let username = usernameInput;
    let pw = pwInput;

    // Send one request to each endpoint using cookie authentication
    for (let request of requestData) {
      const m = request.method;
      let r = {};
      switch (m) {
        case "get":
          r = await myAxios.makeGetRequest(request.url);
          preTestResultCollection.push(r);
          break;
        case "post":
          r = await myAxios.makePostRequest(request.url, username, pw);
          preTestResultCollection.push(r);
          break;
        default:
          console.log("Method not yet supported");
      }
    }

    const preTest = preTestResultCollection;

    // Check if any endpoint returns cookies, if yes, send one request to all endpoints except the one that
    // return the cookies once again with the returned cookies.
    // Endpoints which requires cookies for access will now return a 200 response.
    let tempArray = [];
    for (let preTestResult of preTest) {
      if (preTestResult.setCookiesHeader !== null) {
        let filteredResult = [];
        let nameValuePair = "";
        const allNameValuePairs = parseCookies(
          preTestResult.setCookiesHeader.slice(2).slice(0, -2)
        ); // extract the cookies name-value pair
        nameValuePair = destructureCookies(allNameValuePairs, "string");
        filteredResult = preTest.filter(
          (result) =>
            !(
              result.requestedUrl === preTestResult.requestedUrl &&
              result.method === preTestResult.method
            )
        );
        // Send one request with returned cookies to all endpoints except the one that returned the cookies
        for (let result of filteredResult) {
          const m = result.method;
          let r = {};
          switch (m) {
            case "get":
              r = await myAxios.makeGetRequest(
                result.requestedUrl,
                nameValuePair
              );
              tempArray.push(r);
              break;
            case "post":
              r = await myAxios.makePostRequest(
                result.requestedUrl,
                username,
                pw,
                nameValuePair
              );
              tempArray.push(r);
              break;
            default:
              console.log("Method not yet supported");
          }
        }
      }
    }
    // Store all response from requests to all endpoints with and without cookies for future coverage check
    fs.mkdirSync(`Results/${timestamp}/1_PreFuzz`);
    preTestResultCollection = preTestResultCollection.concat(tempArray);
    const resultFileName = `1_PreFuzz/PreTestRequestsResult.json`;
    const preTestResultWriter = new PreTestResultWriter(
      resultFileName,
      timestamp
    );
    await preTestResultWriter.writeResult(preTestResultCollection);

    let returnedCookiesHeader = [];
    // Coverage check
    let requestData_copy = Array.from(requestData);
    let results = [];
    for (let result of preTestResultCollection) {
      if (result.statusCode === 200) {
        const successRequest = {
          url: result.requestedUrl,
          method: result.method,
          statusCode: result.statusCode,
        };
        results.push(successRequest);
        if (result.setCookiesHeader) {
          returnedCookiesHeader.push(result.setCookiesHeader);
        }
        // Reduce requestData array to get uncovered endpoints.
        for (let i = 0; i < requestData_copy.length; i++) {
          if (requestData_copy[i]["url"] === result.requestedUrl) {
            requestData_copy.splice(i, 1);
          }
        }
      }
    }

    // Report coverage of pre-fuzzing test
    let resultsSet = new Set(results.map(JSON.stringify));
    PreTestLogger.info(
      `Endpoints coverage: ${resultsSet.size} / ${requestData.length}`
    );
    const coveragePercentage = (resultsSet.size / requestData.length) * 100;
    if (coveragePercentage < 75) {
      PreTestLogger.warning(
        `Fuzzing will cover only ${coveragePercentage}% of the endpoints.`
      );
    } else {
      // Best case scenario: 80% - 100% coverage to start fuzzing.
      PreTestLogger.success(
        `Fuzzing will cover ${coveragePercentage}% of the endpoints.`
      );
    }

    if (resultsSet.size !== requestData.length) {
      PreTestLogger.warning("Uncovered endpoints: ");
      console.table(requestData_copy);
      PreTestLogger.warning("Pre-test traffic of uncovered endpoints: ");
      const uncoveredEndpointsTraffic = detectUncoveredEndpoints(
        requestData_copy,
        preTestResultCollection
      );
      PreTestLogger.warning(uncoveredEndpointsTraffic);
      PreTestLogger.warning(
        "Please examine above responses of the uncovered endpoints."
      );
    }

    // Convert the set to an array.
    resultsSet = Array.from(resultsSet);

    // Store returned cookies for coming fuzzing.
    let cookiesHeaderSet = new Set(returnedCookiesHeader);
    cookiesHeaderSet = Array.from(cookiesHeaderSet);

    // This store the returned cookies with all attributes.
    let cookiesForFuzzing = [];
    for (let i = 0; i < cookiesHeaderSet.length; i++) {
      let headers = extractSetCookiesHeader(cookiesHeaderSet[i]);
      for (let x of headers) {
        const parsedCookies = parseCookies(x);
        // Remove cookies that are set to expire in the past (means this cookies were deleted).
        if (parsedCookies.Expires !== undefined) {
          const today = new Date();
          const cookieExpiry = new Date(parsedCookies.Expires);
          if (cookieExpiry.getTime() >= today.getTime()) {
            cookiesForFuzzing.push(parsedCookies);
          }
        }
      }
    }

    const allPreTestErrors = detectPreTestError(
      preTestResultCollection,
      apiData
    );
    if (allPreTestErrors.errorArr.length > 0) {
      PreTestLogger.error(
        "Detected following API implementation errors in pre-fuzzing test. Please examine the following implementation erros in your REST API."
      );
      PreTestLogger.error(allPreTestErrors.errorArr);
    }

    const preTestErrorsFileName = `1_PreFuzz/allServerErrors.json`;
    const preTestErrorWriter = new PreTestResultWriter(
      preTestErrorsFileName,
      timestamp
    );
    await preTestErrorWriter.writeResult(allPreTestErrors.errorArr);

    const preTestOtherErrorsFileName = `1_PreFuzz/allOtherErrors.json`;
    const preTestOtherErrorWriter = new PreTestResultWriter(
      preTestOtherErrorsFileName,
      timestamp
    );
    await preTestOtherErrorWriter.writeResult(allPreTestErrors.otherErrorArr);

    PreTestLogger.info(
      `Extracted ${cookiesForFuzzing.length} valid cookies for fuzzing. ${
        cookiesForFuzzing.length > 0 ? ":" : ""
      }`
    );
    for (let x of cookiesForFuzzing) {
      PreTestLogger.info(JSON.stringify(x));
    }

    if (cookiesForFuzzing.length !== 0) {
      checkCookiesAttributes(cookiesForFuzzing, PreTestLogger);
    } else {
      PreTestLogger.info(
        "No cookies are extracted. No cookies misconfiguration are detected."
      );
    }
    return {
      cookiesForFuzzing: cookiesForFuzzing,
      resultsSet: resultsSet,
      preTestResultFileName: preTestResultWriter.getResultPath(),
      preTestErrorsFileName: preTestErrorWriter.getResultPath(),
      preTestOtherErrorsFileName: preTestOtherErrorWriter.getResultPath(),
      cookiesHeaderSet: cookiesHeaderSet,
    };
  }
}
