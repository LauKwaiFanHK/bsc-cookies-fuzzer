import chalk from "chalk";
import { reassembleCookie } from "./HelperFunctions.js";

export function checkCookiesAttributes(cookiesArr, logger) {
  // Check attributes configuration and give warning.
  for (let x of cookiesArr) {
    const reassembledCookie = reassembleCookie(x);
    const secureCheck = checkSecureAttribute(x);
    const httpCheck = checkHttpAttribute(x);
    const sameSiteCheck = checkSameSiteAttribute(x);
    if (
      secureCheck !== undefined ||
      httpCheck !== undefined ||
      sameSiteCheck !== undefined
    ) {
      let warnMsg = "";
      if (secureCheck !== undefined) {
        warnMsg = secureCheck["Warning"];
      }
      if (httpCheck !== undefined) {
        if (warnMsg.length > 0) {
          warnMsg += "; ";
        }
        warnMsg += httpCheck["Warning"];
      }
      if (sameSiteCheck !== undefined) {
        if (warnMsg.length > 0) {
          warnMsg += "; ";
        }
        warnMsg += sameSiteCheck["Warning"];
      }
      if (warnMsg.length < 1) {
        logger.success(
          reassembledCookie + " --> No cookies misconfiguration detected."
        );
      } else {
        logger.warning("Cookies misconfiguration detected | " + reassembledCookie + ' --> ' + warnMsg);
      }
    }
  }
}

// Check attribute configuration and give warning.
function checkSecureAttribute(parsedCookie) {
  if (parsedCookie["Secure"] === undefined) {
    return {
      Cookie: parsedCookie,
      Warning: chalk.underline(
        "[Secure attribute] Secure flag is not set!"
      ),
    };
  } else if (parsedCookie["Secure"] === false) {
    return {
      Cookie: parsedCookie,
      Warning: chalk.underline(
        "[Secure attribute] Secure flag set as false may lead to security vulnerabilities."
      ),
    };
  } else {
    return {
      Cookie: parsedCookie,
      Warning: "",
    };
  }
}

function checkHttpAttribute(parsedCookie) {
  if (parsedCookie["HttpOnly"] === undefined) {
    return {
      Cookie: parsedCookie,
      Warning: chalk.underline(
        "[HttpOnly attribute] HttpOnly flag is not set!"
      ),
    };
  } else if (parsedCookie["HttpOnly"] === false) {
    return {
      Cookie: parsedCookie,
      Warning: chalk.underline(
        "[HttpOnly attribute] HttpOnly flag set as false allows the cookie to be accessed and manipulated by JavaScript."
      ),
    };
  } else {
    return {
      Cookie: parsedCookie,
      Warning: "",
    };
  }
}

function checkSameSiteAttribute(parsedCookie) {
  if (parsedCookie["SameSite"] === undefined) {
    return {
      Cookie: parsedCookie,
      Warning: chalk.underline(
        "[SameSite attribute] SameSite attribute is not set. Cookie will be sent along with cross-site requests. This increase the risk of cross-origin information leakage and cross-site request forgery attacks."
      ),
    };
  } else if (parsedCookie["SameSite"] === "None") {
    if (
      parsedCookie["Secure"] === undefined ||
      parsedCookie["Secure"] === false
    ) {
      return {
        Cookie: parsedCookie,
        Warning: chalk.underline(
          "[SameSite attribute] A cookie setting a SameSite=None attribute without setting a Secure attribute. This is an invalid format and will cause the browser to reject the cookie... risk in cross-site request forgery attacks."
        ),
      };
    }
    if (parsedCookie["Secure"] === true) {
      return {
        Cookie: parsedCookie,
        Warning: chalk.underline(
          "[SameSite attribute] SameSite flag set as None will not provide any protection and increase the risk of exposure to cross-site request forgery."
        ),
      };
    }
  } else {
    return {
      Cookie: parsedCookie,
      Warning: "",
    };
  }
}
