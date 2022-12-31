import inquirer from "inquirer";
import fs from "fs";
import { cli_openApiFile, cli_username, cli_password } from "./ArgsParser.js";
import { startOpenApiValidation } from "./StartOpenApiValidation.js";
import { startPreFuzzingTest } from "./StartPreFuzzingTest.js";
import { startFuzzing } from "./StartFuzzing.js";
import { startReplay } from "./StartReplay.js";
import PreTestGenerator from "./PreTestGenerator.js";
import PreTestLogger from "./Logger/PreTestLogger.js";
import FuzzTestLogger from "./Logger/FuzzTestLogger.js";

function checkFileExists(path) {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

const question_openApiFile = [
  {
    type: "input",
    name: "openApiFile",
    message: "Please enter the path to the openAPI file.",
    validate: (answer) => {
      if (!answer) {
        return "Please enter a path.";
      } else if (typeof answer !== "string") {
        return "Invalid file path.";
      } else if (answer.split(".").pop()) {
        const fileExtension = answer.split(".").pop();
        if (fileExtension === "yaml" || fileExtension === "yml") {
          return true;
        } else {
          return "Invalid file. Supported file extensions: .yaml, .yml";
        }
      }
      return true;
    },
  },
];

const auth_methods = ["No authentication needed", "Cookie authentication"];

const question_authentication = [
  {
    type: "list",
    name: "authenticationMethod",
    message: "Please select an authentication method.",
    choices: auth_methods,
  },
];

const question_username = (authParameter_name) => {
  return [
    {
      type: "input",
      name: authParameter_name,
      message: `Please enter the ${authParameter_name}.`,
      validate: (answer) => {
        if (!answer) {
          return `Please enter your ${authParameter_name}.`;
        } else if (typeof answer !== "string") {
          return `Invalid ${authParameter_name}.`;
        }
        return true;
      },
    },
  ];
};

const question_password = [
  {
    type: "password",
    name: "rest_api_password",
    message: "Please enter your password.",
    mask: true,
  },
];

const startFuzzChoices = [
  "Continue and start fuzzing",
  "Fix above implementation errors or/and cookies misconfiguration first, exit now.",
];

const question_startFuzz = [
  {
    type: "list",
    name: "startFuzz",
    message: "Please select next action.",
    choices: startFuzzChoices,
  },
];

const finalActionChoice = ["Reproduce above errors.", "Exit"];

const question_reproduceError = [
  {
    type: "list",
    name: "reproduce",
    message: "Please select next action.",
    choices: finalActionChoice,
  },
];

const Inquirer = async () => {
  const testRunDate = new Date();
  const timestamp = testRunDate.getTime();
  fs.mkdirSync(`./Results/${timestamp}`);

  if (cli_openApiFile && cli_username && cli_password) {
    const bool = checkFileExists(cli_openApiFile);
    if (bool) {
      const apiData = await startOpenApiValidation(cli_openApiFile);
      if (
        apiData !== undefined &&
        "cookieAuth" in apiData.auth &&
        apiData.auth.cookieAuth.type === "apiKey"
      ) {
        const preTestData = await startPreFuzzingTest(
          apiData,
          cli_username,
          cli_password,
          timestamp
        );
        if (preTestData !== undefined) {
          const fuzzingData = await startFuzzing(
            preTestData,
            cli_username,
            cli_password,
            timestamp,
            apiData
          );
          if (fuzzingData !== undefined) {
            startReplay(fuzzingData, cli_username, cli_password, timestamp);
          }
        }
      }
    }
  } else {
    inquirer
      .prompt(question_openApiFile)
      .then(async (answer_openAPI_path) => {
        const bool = checkFileExists(answer_openAPI_path.openApiFile);
        if (bool) {
          //-------------------Start of OpenAPI specification validation----------------
          const apiData = await startOpenApiValidation(
            answer_openAPI_path.openApiFile
          );
          //-------------------Start of pre-fuzzing test----------------
          if (
            apiData !== undefined &&
            "cookieAuth" in apiData.auth &&
            apiData.auth.cookieAuth.type === "apiKey"
          ) {
            const authParameter_name = apiData.auth.cookieAuth.name;
            inquirer
              .prompt(question_authentication)
              .then(async (answer_auth_method) => {
                console.log(
                  `Pretest will be executed with the following authentication method: ${answer_auth_method.authenticationMethod}`
                );
                let preTestData;
                let fuzzingData;
                if (
                  answer_auth_method.authenticationMethod === auth_methods[1]
                ) {
                  inquirer
                    .prompt(question_username(authParameter_name))
                    .then((answer_username) => {
                      inquirer
                        .prompt(question_password)
                        .then(async (answer_password) => {
                          preTestData = await startPreFuzzingTest(
                            apiData,
                            answer_username.username,
                            answer_password.rest_api_password,
                            timestamp
                          );
                          inquirer
                            .prompt(question_startFuzz)
                            .then(async (answer_startOrNot) => {
                              if (
                                answer_startOrNot.startFuzz ===
                                startFuzzChoices[1]
                              ) {
                                PreTestLogger.info("Exited.");
                                return;
                              }
                              //-------------------Start of fuzzing----------------------------------------------
                              if (
                                answer_startOrNot.startFuzz ===
                                startFuzzChoices[0]
                              ) {
                                fuzzingData = await startFuzzing(
                                  preTestData,
                                  answer_username.username,
                                  answer_password.rest_api_password,
                                  timestamp,
                                  apiData
                                );
                                inquirer
                                  .prompt(question_reproduceError)
                                  .then(async (answer_reproduceOrExit) => {
                                    // ----------------Start of replay errors -----------------------------
                                    if (
                                      answer_reproduceOrExit.reproduce ===
                                      finalActionChoice[0]
                                    ) {
                                      startReplay(
                                        fuzzingData,
                                        answer_username.username,
                                        answer_password.rest_api_password,
                                        timestamp
                                      );
                                    }
                                    if (
                                      answer_reproduceOrExit ===
                                      finalActionChoice[1]
                                    ) {
                                      FuzzTestLogger.info("Exited.");
                                    }
                                  });
                              }
                            });
                        });
                    });
                } else {
                  preTestData = await startPreFuzzingTest(
                    apiData,
                    undefined,
                    undefined,
                    timestamp
                  );
                }
              });
          } else {
            PreTestLogger.warn(
              "Please make sure openAPI file for the REST API conforms to openAPI specification format and try again."
            );
          }
        } else {
          console.log("File not found. Please enter a correct path.");
          Inquirer();
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

export default Inquirer;
