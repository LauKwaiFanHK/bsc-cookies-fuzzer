export function detectUncoveredEndpoints(
  requestData_copy,
  preTestResultCollection
) {
  for (let x of requestData_copy) {
    const uncoveredEndpointResponse = [];
    for (let y of preTestResultCollection) {
      if (x.url === y.requestedUrl) {
        uncoveredEndpointResponse.push(y);
      }
    }
    return uncoveredEndpointResponse;
  }
}

export function detectPreTestError(responseArr) {
  let errorArr = [];
  let otherErrorArr = [];
  for (let x of responseArr) {
    if (x["statusCode"] !== null || x["statusCode"] !== undefined) {
      // Catch server errors (5xx).
      const responseStatusCode = x["statusCode"].toString();
      if (responseStatusCode[0] === "5") {
        errorArr.push(x);
      } else if (responseStatusCode[0] !== "2") {
        // Catch other errors
        otherErrorArr.push(x);
      }
    } else {
      // Catch error codes that is not visible to HTTP status code e.g. custom errors.
      otherErrorArr.push(x);
    }
  }
  return { errorArr: errorArr, otherErrorArr: otherErrorArr };
}

export function detectFuzzTestError(fuzzingResults) {
  let serverErrorArr = [];
  let otherErrorArr = [];
  let serverErrorRequestSequence = [];
  let otherErrorRequestSequence = [];
  for (let x of fuzzingResults) {
    const seqId = x["requestSequenceId"];
    const result = x["result"];
    for (let y of result) {
      if (y["statusCode"] !== null || y["statusCode"] !== undefined) {
        // Catch server errors (5xx).
        const responseStatusCode = y["statusCode"].toString();
        if (responseStatusCode[0] === "5") {
          serverErrorArr.push({ requestSequenceId: seqId, errorResponse: y });
          serverErrorRequestSequence.push(x);
        } else if (responseStatusCode[0] !== "2") {
          // Catch other errors
          otherErrorArr.push({ requestSequenceId: seqId, errorResponse: y });
          otherErrorRequestSequence.push(x);
        } 
      } else {
        // Catch error codes that is not visible to HTTP status code.
        serverErrorArr.push({ requestSequenceId: seqId, errorResponse: y });
        serverErrorRequestSequence.push(x);
      }
    }
  }
  return {
    serverErrorArr: serverErrorArr,
    serverErrorRequestSequence: serverErrorRequestSequence,
    otherErrorArr: otherErrorArr,
    otherErrorRequestSequence: otherErrorRequestSequence,
  };
}
