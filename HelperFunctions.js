// Parse cookies into an object with name-value pairs in the cookies
export function parseCookies(str) {
  if (str !== undefined) {
    const parsedCookies = str
      .split(";")
      .map((v) => v.split("="))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1]);
        return acc;
      }, {});
    for (let attribute of Object.keys(parsedCookies)) {
      // Check if the returned cookies has HttpOnly flag, if yes, assign a true boolean
      if (attribute === "HttpOnly") {
        parsedCookies.HttpOnly = true;
      }
      // Check if the returned cookies has Secure flag, if yes, assign a true boolean
      if (attribute === "Secure") {
        parsedCookies.Secure = true;
      }
    }
    return parsedCookies;
  }
}

// Parse cookies header and retrieve cookies name-value pair and attributes name-value pairs.
export function destructureCookies(setCookiesHeader, returnType) {
  // Extract and store all cookies name-value pairs in an array.
  let cookiesNameValuePairsArray = [];
  // Get the cookies content without all attributes. Send this to request in a Cookie header as well.
  let cookiesNameValuePairsString = "";
  let cookiesAttributesArray = [];
  const fullCookiesContent = Object.entries(setCookiesHeader);
  for (let x of fullCookiesContent) {
    const myKey = x[0];
    const myValue = x[1];
    if (
      myKey === "Max-Age" ||
      myKey === "Path" ||
      myKey === "Expires" ||
      myKey === "HttpOnly" ||
      myKey === "Secure" ||
      myKey === "SameSite" ||
      myKey === "Domain"
    ) {
      if (returnType === "cookies_attributes_array") {
        cookiesAttributesArray.push({ [myKey]: myValue });
      }
    } else {
      if (returnType === "array") {
        cookiesNameValuePairsArray.push(`${myKey}=${myValue}; `);
      }
      if (returnType === "string") {
        cookiesNameValuePairsString += myKey + "=" + myValue + "; ";
      }
    }
  }
  if (returnType === "cookies_attributes_array") {
    return cookiesAttributesArray;
  }
  if (returnType === "array") {
    return cookiesNameValuePairsArray;
  }
  if (returnType === "string") {
    return cookiesNameValuePairsString;
  }
}

// Check if received cookies is expired. If yes, just remove it.
export function checkValidCookies(parsedCookies) {
  if (parsedCookies.Expires !== undefined) {
    const today = new Date();
    const cookieExpiry = new Date(parsedCookies.Expires);
    if (cookieExpiry.getTime() <= today.getTime()) {
      return false;
    } else {
      return true;
    }
  }
}

// Compute all sequences of requests for fuzzing.
export function findRequestSequences(allEndpoints) {
  let result = [];

  if (allEndpoints.length === 1) {
    return allEndpoints;
  }

  for (let i = 0; i < allEndpoints.length; i++) {
    let currentEndpoint = allEndpoints[i];
    const remainingEndpoints = allEndpoints
      .slice(0, i)
      .concat(allEndpoints.slice(i + 1));

    const remainingEndpointsPermuted = findRequestSequences(remainingEndpoints);

    for (let j = 0; j < remainingEndpointsPermuted.length; j++) {
      const premutedArray = [currentEndpoint].concat(
        remainingEndpointsPermuted[j]
      );

      result.push(premutedArray);
    }
  }
  return result;
}

export function extractSetCookiesHeader(str) {
  let headerArr = [];
  if (str.includes('"')) {
    const splittedHeaders = str.slice(2).slice(0, -2).split('"');
    for (let x of splittedHeaders) {
      if (x !== ",") {
        headerArr.push(x);
      }
    }
  } else {
    headerArr.push(str);
  }
  return headerArr;
}

export function reassembleCookie(cookieObj) {
  let cookieStr = "";
  for (const [key, value] of Object.entries(cookieObj)) {
    if (key === Object.keys(cookieObj).pop()) {
      cookieStr += key + "=" + value;
    } else {
      cookieStr += key + "=" + value + "; ";
    }
  }
  return cookieStr;
}

export function extractCookieNameValuePair(cookiesArr) {
  let allNameValuePairs = [];
  for (let x of cookiesArr) {
    const keys = Object.keys(x);
    for (let y of keys) {
      if (
        y === "Max-Age" ||
        y === "Path" ||
        y === "Expires" ||
        y === "HttpOnly" ||
        y === "SameSite"
      ) {
        break;
      } else {
        allNameValuePairs.push(`${y}=${x[y]}; `);
      }
    }
  }
  return allNameValuePairs;
}

export function extractSingleNameValuePair(parsedCookie) {
  const keys = Object.keys(parsedCookie);
  let nameValuePair = "";
  for (let y of keys) {
    if (
      y === "Max-Age" ||
      y === "Path" ||
      y === "Expires" ||
      y === "HttpOnly" ||
      y === "SameSite"
    ) {
      break;
    } else {
      nameValuePair = `${y}=${parsedCookie[y]}; `;
    }
  }
  return nameValuePair;
}

export function convertSetToObjectArray(set) {
  let newArr = [];
  if (set.size > 0) {
    set.forEach((x) => {
      x.slice(1).slice(0, -1);
      const obj = JSON.parse(x);
      newArr.push(obj);
    });
  }
  return newArr;
}

export function extractAllParsedCookies(fuzzingResults) {
  let cookiesArr = [];
  for (let x of fuzzingResults) {
    const result = x["result"];
    for (let x of result) {
      const cookiesHeaders = x["setCookiesHeader"];
      if (cookiesHeaders !== null) {
        const allNameValuePairs = extractSetCookiesHeader(cookiesHeaders);
        if (allNameValuePairs.length > 0) {
          for (let i = 0; i < allNameValuePairs.length; i++) {
            const parsedCookie = parseCookies(allNameValuePairs[i]);
            if (checkValidCookies(parsedCookie) === true) {
              cookiesArr.push(parsedCookie);
            }
          }
        }
      }
    }
  }
  return cookiesArr;
}

export function extractCookiesHeaderSample(
  returnedCookiesHeaders,
  nameValuePairs
) {
  const sampleArr = [];
  for (let x of nameValuePairs) {
    if (returnedCookiesHeaders.length > 0) {
      let cookiesHeaderSampleArr = [];
      for (let i of returnedCookiesHeaders) {
        const nameValuePair = extractSingleNameValuePair(i);
        if (x === nameValuePair) {
          cookiesHeaderSampleArr.push(i);
        }
      }
      sampleArr.push(cookiesHeaderSampleArr[0]);
    }
  }
  return sampleArr;
}

export function truncateLongCookie(cookie) {
  let formattedCookie;
  if (cookie.length > 20) {
    formattedCookie = cookie.slice(0, 16) + "...";
  } else {
    formattedCookie = cookie;
  }
  return formattedCookie;
}

findRequestSequences([1,2,3]);