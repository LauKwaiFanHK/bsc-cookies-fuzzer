import PreTestResultWriter from "./ResultWriter.js";
import PreTestLogger from "./Logger/PreTestLogger.js";
import OpenApiParser from "./OpenApiParser.js";
import RequestDataGenerator from "./RequestDataGenerator.js";
import AxiosCallGenerator from "./AxiosCallGenerator.js";
import FuzzTestGenerator from "./FuzzTestGenerator.js";
import {
  parseCookies,
  destructureCookies,
  findRequestSequences,
  extractSetCookiesHeader,
  detectPretestError,
} from "./HelperFunctions.js";
import Queue from "./Queue.js";
import { checkCookiesAttributes } from "./CookiesAttributesChecker.js";

//-------------------Start of OpenAPI specification validation----------------
// Producer to produce fuzz-related data
const myOpenApiParser = new OpenApiParser();
const apiData = await myOpenApiParser.validateOpenApiSpec("openAPI_v1.yaml");

//-------------------Start of pretest-----------------------------------------
// Produce data containing urls and the corresponding method
if (apiData !== undefined) {
  const myRequestDataGenerator = new RequestDataGenerator(apiData);
  const requestData = myRequestDataGenerator.computePermutation();

  // Send requests to all endpoints to get pre-fuzzing response
  const myAxios = new AxiosCallGenerator();
  let requestCount = 0;
  let preTestResultCollection = [];
  let username = "Billy";
  let pw = "abc123";

  // Todo: implement for other methods
  // Todo: support token based authentication (pass username and pw to every request)
  // Send one request to each endpoint using cookie authentication
  for (let request of requestData) {
    const m = request.method;
    let r = {};
    switch (m) {
      case "get":
        r = await myAxios.makeGetRequest(request.url);
        preTestResultCollection.push(r);
        requestCount++;
        break;
      case "post":
        r = await myAxios.makePostRequest(request.url, username, pw);
        preTestResultCollection.push(r);
        requestCount++;
        break;
      default:
        requestCount = requestCount;
    }
  }

  const preTest = preTestResultCollection;
  // console.log(preTest);

  // Check if any endpoint returns cookies, if yes, send one request to all endpoints except the one that
  // return the cookies once again with the returned cookies.
  // Endpoints which requires cookies for access will now return a 200 response.
  let tempArray = [];
  for (let preTestResult of preTest) {
    if (preTestResult.setCookiesHeader !== null) {
      let filteredResult = [];
      let nameValuePair;
      const allNameValuePairs = parseCookies(
        preTestResult.setCookiesHeader.slice(2).slice(0, -2),
        "string"
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
            requestCount++;
            break;
          case "post":
            r = await myAxios.makePostRequest(
              result.requestedUrl,
              username,
              pw,
              nameValuePair
            );
            tempArray.push(r);
            requestCount++;
            break;
          default:
            requestCount = requestCount;
        }
      }
    }
  }

  // Store all response from requests to all endpoints with and without cookies for future coverage check
  preTestResultCollection = preTestResultCollection.concat(tempArray);
  const preTestResultWriter = new PreTestResultWriter();
  preTestResultWriter.writeResult(preTestResultCollection);

  let returnedCookiesHeader = [];
  // Coverage check
  let results = [];
  for (let result of preTestResultCollection) {
    if (result.statusCode === 200) {
      const successRequest = {
        url: result.requestedUrl,
        method: result.method,
      };
      results.push(successRequest);
      if (result.setCookiesHeader) {
        returnedCookiesHeader.push(result.setCookiesHeader);
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

  // Convert the set to an array.
  resultsSet = Array.from(resultsSet);
  // console.log(resultsSet);

  // Store returned cookies for coming fuzzing.
  let cookiesHeaderSet = new Set(returnedCookiesHeader);
  // console.log(cookiesHeaderSet);
  cookiesHeaderSet = Array.from(cookiesHeaderSet);
  // console.log(cookiesHeaderSet);

  // This store the returned cookies with all attributes.
  let cookiesForFuzzing = [];
  for (let i = 0; i < cookiesHeaderSet.length; i++) {
    let headers = extractSetCookiesHeader(cookiesHeaderSet[i]);
    // console.log(headers);
    for (let x of headers) {
      const parsedCookies = parseCookies(x);
      // console.log(parsedCookies);
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

  //console.log(cookiesForFuzzing);

  PreTestLogger.info(
    `Extracted ${cookiesForFuzzing.length} valid cookies for fuzzing.`
  );
  for (let x of cookiesForFuzzing) {
    PreTestLogger.info(JSON.stringify(x));
  }
  PreTestLogger.error(
    "Detected following API implementation errors in pre-test:"
  );
  PreTestLogger.error(detectPretestError(preTestResultCollection));

  if (cookiesForFuzzing.length !== 0) {
    PreTestLogger.warning(
      "Detected following cookies misconfiguration in pre-test:"
    );
    // console.log(cookiesForFuzzing);
    checkCookiesAttributes(cookiesForFuzzing);
  } else {
    PreTestLogger.info(
      "No cookies are extracted. Hence, no cookies misconfiguration are detected."
    );
  }

  // ----------------------------Start of fuzzing---------------------------
  // Put the array of request sequences to a queue instance.
  if (resultsSet.length > 0) {
    const fuzzTestsQueue = new Queue();
    let requestSequences = [];
    requestSequences = findRequestSequences(resultsSet);
    for (let x of requestSequences) {
      fuzzTestsQueue.enqueue(x);
    }
    // console.log(requestSequences);

    // Next, send request to each endpoint with each name-value pair in a Cookie header.
    // Also, fuzz each name and each value.

    const testCookies = "username=Billy; ";

    // Send request sequentially together with a specified cookies fuzzed value.
    const myAxios_fuzz = new AxiosCallGenerator();
    const myFuzzer = new FuzzTestGenerator();
    const fuzzingResults = await myFuzzer.runRequestSequence(
      myAxios_fuzz,
      requestSequences,
      testCookies,
      username,
      pw
    );
    //console.log(fuzzingResults[119]);
    // Check attributes configuration and give warning.
    for (let x of fuzzingResults) {
      const res = x["result"];
      //console.log(res);
      for (let y of res) {
        const header = y["setCookiesHeader"];
        if (header) {
          const arr = extractSetCookiesHeader(header);
          for (let c of arr) {
            const parsedCookie = parseCookies(c);
            // console.log(typeof parsedCookie);
            //checkCookiesAttributes(parsedCookie);
          }
        }
      }
    }
  }
} else {
  PreTestLogger.info(
    "Please make sure openAPI file for the REST API conforms to openAPI specification format and try again."
  );
}
