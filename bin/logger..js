var winston = require('winston');


const {createLogger, format, transports} = require('winston');
const {combine, timestamp, json} = format;

const logger = createLogger({
    level: 'info',

    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        json(),
    ),


    //  format: winston.format.json(),


    defaultMeta: {service: 'user-connection'},
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({filename: 'error.log', level: 'error'}),
        new winston.transports.File({filename: '../logs/bailletarchives-connections.log', level: 'info'})
    ]
});


//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = logger;
