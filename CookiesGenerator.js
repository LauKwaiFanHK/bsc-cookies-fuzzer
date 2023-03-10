import {
  fuzzedValues,
  fuzzedSeparators,
  randomCookies,
} from "./FuzzDictionary.js";
import { getRandomString } from "./HelperFunctions.js";

export function CookiesGenerator(allNameValuePairs) {
  let newAllNameValuePairs = [];
  for (let a of allNameValuePairs) {
    newAllNameValuePairs.push(a);
  }
  for (let x of allNameValuePairs) {
    x = x.slice(0, -2);
    const cookieName = x.split("=")[0];
    const cookieValue = x.split("=")[1];
    const longStrCookie = cookieName + "=" + getRandomString(4096*3001 ) + "; ";
    newAllNameValuePairs.push(longStrCookie);
    for (let y of fuzzedValues) {
      const newCookieSameName = cookieName + "=" + String(y) + "; ";
      newAllNameValuePairs.push(newCookieSameName);
    }
    for (let z of fuzzedSeparators) {
      const newCookie = cookieName + z + cookieValue + "; ";
      newAllNameValuePairs.push(newCookie);
    }
    for (let a of fuzzedValues) {
      const newCookie = String(a) + "=" + cookieValue + "; ";
      newAllNameValuePairs.push(newCookie);
    }
    for (let b of randomCookies) {
      newAllNameValuePairs.push(b);
    }
  }
  return newAllNameValuePairs;
}
