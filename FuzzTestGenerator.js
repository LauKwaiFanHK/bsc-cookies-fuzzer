import {
  parseCookies,
  destructureCookies,
  checkValidCookies,
  extractSetCookiesHeader,
  truncateLongCookie,
} from "./HelperFunctions.js";
import { Blob } from "node:buffer";

// This module send requests to all sequence permutation
export default class FuzzTestGenerator {
  constructor() {}

  async runRequestSequence(
    testGenerator,
    requestArr,
    fuzzedCookies,
    username,
    pw
  ) {
    let fuzzTestResults = [];
    let formattedRequestArr = [];
    let reqSeqId = 0;

    if (requestArr.length > 1) {
      for (let x of requestArr) {
        let parsedReqSeq = [];
        for (let y of x) {
          parsedReqSeq.push(JSON.parse(y));
        }
        formattedRequestArr.push(parsedReqSeq);
      }
    }

    // One element in formattedRequestArr corresponds to one request sequence
    for (let x of formattedRequestArr) {
      let reqSeqResult = [];
      reqSeqId++;
      let myFuzzedCookies = fuzzedCookies;
      const seqLength = x.length;
      let requestIndex = 0;
      while (requestIndex < seqLength) {
        let b = "";
        const nextReqIndex = requestIndex + 1;
        if (nextReqIndex === seqLength + 1) {
          break;
        } else {
          const thisReq = x[requestIndex];
          let r = {};
          const m = thisReq.method;
          switch (m) {
            case "get":
              r = await testGenerator.makeGetRequest(
                thisReq.url,
                myFuzzedCookies
              );
              break;
            case "post":
              r = await testGenerator.makePostRequest(
                thisReq.url,
                username,
                pw,
                myFuzzedCookies
              );
              break;
            default:
              console.log("Method not yet supported.");
          }
          reqSeqResult.push(r);
          const returnedCookies = r["setCookiesHeader"];
          if (returnedCookies) {
            const headerArr = extractSetCookiesHeader(returnedCookies);
            for (let x of headerArr) {
              const a = parseCookies(x);
              if (checkValidCookies(a)) {
                b += destructureCookies(a, "string");
              }
            }
          }
        }
        requestIndex++;
        if (myFuzzedCookies !== undefined) {
          myFuzzedCookies = myFuzzedCookies + b;
          let allValidReturnedCookies = myFuzzedCookies
            .split(" ")
            .filter((item) => item !== "");
          let allValidReturnedCookiesSet = Array.from(
            new Set(allValidReturnedCookies)
          );
          let nextFuzzedCookies = "";
          for (let x of allValidReturnedCookiesSet) {
            nextFuzzedCookies = nextFuzzedCookies + x + " ";
          }
          myFuzzedCookies = nextFuzzedCookies;
        }
      }

      if (myFuzzedCookies !== null && myFuzzedCookies !== undefined) {
        if (new Blob([myFuzzedCookies]).size > 4096) {
          myFuzzedCookies =
            truncateLongCookie(myFuzzedCookies) +
            (new Blob([myFuzzedCookies]).size + " bytes");
        }
      }

      fuzzTestResults.push({
        fuzzedCookie: myFuzzedCookies,
        requestSequenceId: reqSeqId,
        result: reqSeqResult,
      });
    }
    return fuzzTestResults;
  }
}
