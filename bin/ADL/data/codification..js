var Codification = {}

var codeRegex = {
    "6.2	Main equipment tag structure  (TOTAL-T0000000001) ": /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})(?<suffix>\w{0,1})$/g,
    "7.2	Switchgears and MCC compartments tag structure (TOTAL-T0000000003)": /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,5})(?<suffix>\w{0,1})-(?<busBar>\w{1,2})(?<column>\d{0,2})(?<row>\d{0,2})$/g,
    "7.3	Lighting and small power equipment tag structure (TOTAL-T0000000018))": /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})-(?<circuitBreaker>\d{2})(?<seqNumber>[\d\w]{0,2})$/g,
    "11.1	Piping tag structure (TOTAL-T0000000009)": /^(?<sector>[\w\d]{2})-(?<pipingSize>\d\d\{0,3}\d)-(?<fluid>\w{2,3})(?<system>\w)(?<subSystem>\d)-(?<seqNum>\d{1,4})-(?<pipingClass>\w\d{2}\w{0,1}\d{0,1})-(?<insulationCode>\w{0.2})$/gm,
    "FL": /([^\/][\d\w]+)\/*([^\/][\d\w]*)\/*([^\/][-\d\w]*)\/*([^\/][-\d\w]*)/g
}