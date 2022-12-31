import ErrorReproduction from "./ErrorReproduction.js";
import ReplayLogger from "./Logger/ReplayLogger.js";

function displayReplayResultsFilePath(replayResultsData) {
  if (replayResultsData.replayResultsFileName !== undefined) {
    ReplayLogger.info(
      "Replayed traffic was saved. Navigate to the following path for details:"
    );
    console.log(replayResultsData.replayResultsFileName);
  }
}

export async function startReplay(fuzzingData, username, password, timestamp) {
  const replayedResponse = await ErrorReproduction(
    fuzzingData.allErrorRequestSequences,
    username,
    password,
    timestamp
  );
  ReplayLogger.info("Replaying errors...");
  displayReplayResultsFilePath(replayedResponse);
}
