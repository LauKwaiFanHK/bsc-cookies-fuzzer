import axios from "axios";
import { Blob } from "node:buffer";
import { truncateLongCookie } from "./HelperFunctions.js";

// A module to generate axios call using different http request methods
// Record results of one test run
export default class AxiosCallGenerator {
  constructor() {
    this.testId = 0;
    this.testResult = null;
    this.reqSeqTestResult = null;
  }

  generateResult(url, res, method, returnedCookies, sentCookies) {
    if (sentCookies !== null && sentCookies !== undefined) {
      if (new Blob([sentCookies]).size > 4096) {
        sentCookies =
          truncateLongCookie(sentCookies) +
          (new Blob([sentCookies]).size + " bytes");
      }
    }
    this.testId++;
    const date = new Date(Date.now());
    this.testResult = {
      testId: this.testId,
      time: date.toString(),
      method: method,
      requestedUrl: url,
      sentCookies: sentCookies,
      statusCode:
        res.status !== undefined && res.status === 200
          ? res.status
          : res.response !== undefined
          ? res.response.status
          : res.response
          ? res.response
          : res.code,
      responseMessage:
        res.status !== undefined && res.status === 200
          ? res.statusText
          : res.response !== undefined
          ? res.response.statusText
          : res.response
          ? res.response
          : res.name,
      setCookiesHeader:
        returnedCookies === undefined || returnedCookies === null
          ? null
          : JSON.stringify(returnedCookies),
    };
    return this.testResult;
  }

  iterateCookiesHeadersArr(headerArr) {
    let returnedHeaders = [];
    for (let x of headerArr) {
      returnedHeaders.push(x);
    }
    return returnedHeaders[0];
  }

  async makeGetRequest(url, cookies) {
    if (cookies === undefined) {
      return await axios
        .get(url)
        .then((res) => {
          const returnedCookies = res.headers["set-cookie"];
          return this.generateResult(url, res, "get", returnedCookies, null);
        })
        .catch((err) => {
          return this.generateResult(url, err, "get", null, null);
        });
    } else {
      return await axios
        .get(url, {
          headers: {
            Cookie: cookies,
          },
        })
        .then((res) => {
          const returnedCookies = res.headers["set-cookie"];
          return this.generateResult(url, res, "get", returnedCookies, cookies);
        })
        .catch((err) => {
          return this.generateResult(url, err, "get", undefined, cookies);
        });
    }
  }

  async makePostRequest(url, username, pw, cookies) {
    if (cookies === undefined) {
      return await axios
        .post(url, { username: username, password: pw })
        .then((res) => {
          const returnedCookies = res.headers["set-cookie"];
          return this.generateResult(url, res, "post", returnedCookies, null);
        })
        .catch((err) => {
          return this.generateResult(url, err, "post", null, null);
        });
    } else {
      return await axios
        .post(
          url,
          {
            username: username !== undefined ? username : "",
            password: pw !== undefined ? pw : "",
          },
          { headers: { Cookie: cookies } }
        )
        .then((res) => {
          const returnedCookies = res.headers["set-cookie"];
          return this.generateResult(
            url,
            res,
            "post",
            returnedCookies,
            cookies
          );
        })
        .catch((err) => {
          return this.generateResult(url, err, "post", undefined, cookies);
        });
    }
  }
}
