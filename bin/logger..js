/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const fs = require("fs");
const path = require("path");

const winston = require("winston");
require("winston-daily-rotate-file");

const { createLogger, format } = require("winston");
const { combine, timestamp, json } = format;
const { readMainConfig } = require("../model/config");

const config = readMainConfig();

const logDir = config.logs.directory ? config.logs.directory : "logs";

const loggerProps = {
    defaultMeta: { service: "user-navigation" },
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), json()),
    level: "info",
};

if (config.logs.useFileLogger) {
    const transportProps = {
        createSymlink: config.logs.useSymlink,
        datePattern: "YYYY-MM",
        keep: 12,
        zippedArchive: false,
    };

    const errorTransport = new winston.transports.DailyRotateFile({
        ...transportProps,
        filename: path.join(logDir, "error.log.%DATE%"),
        level: "error",
        symlinkName: "error.log",
    });

    const InfoTransport = new winston.transports.DailyRotateFile({
        ...transportProps,
        filename: path.join(logDir, "vocables.log.%DATE%"),
        level: "info",
        symlinkName: "vocables.log",
    });

    loggerProps.transports = [errorTransport, InfoTransport];
}

// Remove the log symlinks if there are unwanted
if (!config.logs.useSymlink) {
    for (file of ["error", "vocables"]) {
        const logFile = path.join(logDir, `${file}.log`);
        if (fs.existsSync(logFile) && fs.lstatSync(logFile).isSymbolicLink()) {
            fs.unlinkSync(logFile);
        }
    }
}

const logger = createLogger(loggerProps);

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    );
}

module.exports = logger;
