import fs from "fs";
import AxiosCallGenerator from "./AxiosCallGenerator.js";
import { checkValidCookies, parseCookies } from "./HelperFunctions.js";
import ResultWriter from "./ResultWriter.js";

export default async function ErrorReproduction(
  allErrorRequestSequences,
  usernameInput,
  pwInput,
  timestamp
) {
  if (allErrorRequestSequences.length > 0) {
    let username = usernameInput;
    let pw = pwInput;
    let seqResultCollection = [];
    let allSeqResults = [];
    let replayResultCollection = [];
    for (let x of allErrorRequestSequences) {
      const errorRequestSeqData = x["errorRequestSequence"];
      // seqResultCollection["cookieSent"] = x["cookie"];
      if (errorRequestSeqData.length > 0) {
        for (let y of errorRequestSeqData) {
          let cookieToSend = x["cookie"];
          const result = y["result"];
          const requestSeqId = y["requestSequenceId"];
          const myAxios = new AxiosCallGenerator();
          let localReplayData = {};
          localReplayData["cookiesSent"] = cookieToSend;
          localReplayData["requestSequenceId"] = requestSeqId;
          localReplayData["replayResponse"] = [];
          for (let i = 0; i < result.length; i++) {
            const m = result[i].method;
            const url = result[i].requestedUrl;
            let r = {};
            let replayObj = {};
            switch (m) {
              case "get":
                r = await myAxios.makeGetRequest(url, cookieToSend);
                replayObj = {
                  response: {
                    time: r["time"],
                    requestMethod: r["method"],
                    requestedUrl: r["requestedUrl"],
                    statusCode: r["statusCode"],
                  },
                };
                localReplayData["replayResponse"].push(replayObj);
                break;
              case "post":
                r = await myAxios.makePostRequest(
                  url,
                  username,
                  pw,
                  cookieToSend
                );
                replayObj = {
                  response: {
                    time: r["time"],
                    requestMethod: r["method"],
                    requestedUrl: r["requestedUrl"],
                    statusCode: r["statusCode"],
                  },
                };
                localReplayData["replayResponse"].push(replayObj);
                break;
              default:
                console.log("Method not supported yet!");
            }
            const returnedHeader = r["setCookiesHeader"];
            if (returnedHeader !== null) {
              let returnedHeader2Array = [];
              const returnedHeader2 = returnedHeader.slice(2).slice(0, -2);
              if (returnedHeader2.search('","')) {
                returnedHeader2Array = returnedHeader2.split('","');
              } else {
                returnedHeader2Array.push(returnedHeader2);
              }
              for (let x of returnedHeader2Array) {
                const parsedHeader = parseCookies(x);
                if (checkValidCookies(parsedHeader) === true) {
                  delete parsedHeader["Max-Age"];
                  delete parsedHeader["Path"];
                  delete parsedHeader["Expires"];
                  delete parsedHeader["HttpOnly"];
                  delete parsedHeader["Secure"];
                  delete parsedHeader["SameSite"];
                  const key = Object.keys(parsedHeader);
                  const value = parsedHeader[key];
                  const newCookie = `${key}=${value}; `;
                  if (cookieToSend.search(newCookie) === -1) {
                    cookieToSend += newCookie;
                  }
                }
              }
            }
          }
          replayResultCollection.push(localReplayData);
        }
      }
    }
    // Write all replayed traffic to Results/ReplayErrors folder
    fs.mkdirSync(`Results/${timestamp}/3_Replay`);
    const replayResultsFileName = "3_Replay/allReplayedTraffic.json";
    const replayResultsWriter = new ResultWriter(
      replayResultsFileName,
      timestamp
    );
    await replayResultsWriter.writeResult(replayResultCollection);

    return {
      replayResultsFileName: replayResultsWriter.getResultPath(),
    };
  }
}
