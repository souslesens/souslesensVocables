/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var path = require("path");
var winston = require("winston");

const { createLogger, format, transports } = require("winston");
const { combine, timestamp, json } = format;
const config = require(path.resolve('config/mainConfig.json'));

const logDir = config.logDir ? config.logDir : "log/souslesens"

const ConfigManager = require("./configManager.");

var logPaths = null;
const getlogPaths = function () {
    if (logPaths) return logPaths;
    else {
        // a refaire !!!!!!!!!!!!!!!!!!!!
        var mainConfig = ConfigManager.getGeneralConfig();
        if (!mainConfig) {
            setTimeout(function () {
                logPaths = mainConfig.logger;
                return mainConfig.logger;
            }, 500);
        } else {
            logPaths = mainConfig.logger;
            return mainConfig.logger;
        }
    }
};
var errorsLogPath = "logs/error.log";
var usersLogPath = "logs/vocables.log";

/*var errorsLogPath = getlogPaths().errorsLogPath;
var usersLogPath = getlogPaths().usersLogPath;*/

const logger = createLogger({
    level: "info",

    format: combine(
        timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        json()
    ),

    defaultMeta: { service: "user-navigation" },

    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({ filename: logDir + "/error.log", level: "error" }),
        new winston.transports.File({ filename: logDir + "/vocables.log", level: "info" }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

module.exports = logger;
