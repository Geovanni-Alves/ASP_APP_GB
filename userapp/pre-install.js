const fs = require("fs");

const buildProfile = process.env.EAS_BUILD_PROFILE;
const configProd = process.env.AWS_EXPORTS;
const configDevelop = process.env.AWS_EXPORTS;

const config = buildProfile === "production" ? configProd : configDevelop;

const decoded = Buffer.from(config, "base64").toString();

fs.writeFileSync("./src/aws-exports.js", decoded);
