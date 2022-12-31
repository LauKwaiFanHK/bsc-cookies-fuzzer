import winston from "winston";
import { CustomColors, CustomLevels } from "./CustomLevelsAndColors.js";

const logConfig = {
  levels: CustomLevels,
  transports: [
    new winston.transports.Console(),
  ],
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.label({
      label: "Pre-fuzzing",
    }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) =>
        `${info.label} | ${info.timestamp} | ${info.level} | ${info.message}`
    )
  ),
};

const PreTestLogger = winston.createLogger(logConfig);

winston.addColors(CustomColors);

export default PreTestLogger;
