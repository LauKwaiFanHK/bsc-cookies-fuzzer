import Starter from "./Starter.js";

function startPreTestPhase() {
  try {
    Starter();
  } catch (err) {
    console.log(err);
  }
};

startPreTestPhase();
