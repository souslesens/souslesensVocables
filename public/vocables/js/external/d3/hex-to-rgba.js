'use strict';

var removeHash = function removeHash(hex) {
  return hex.charAt(0) === '#' ? hex.slice(1) : hex;
};

var parseHex = function parseHex(nakedHex) {
  var isShort = nakedHex.length === 3 || nakedHex.length === 4;

  var twoDigitHexR = isShort ? '' + nakedHex.slice(0, 1) + nakedHex.slice(0, 1) : nakedHex.slice(0, 2);
  var twoDigitHexG = isShort ? '' + nakedHex.slice(1, 2) + nakedHex.slice(1, 2) : nakedHex.slice(2, 4);
  var twoDigitHexB = isShort ? '' + nakedHex.slice(2, 3) + nakedHex.slice(2, 3) : nakedHex.slice(4, 6);
  var twoDigitHexA = (isShort ? '' + nakedHex.slice(3, 4) + nakedHex.slice(3, 4) : nakedHex.slice(6, 8)) || 'ff';

  // const numericA = +((parseInt(a, 16) / 255).toFixed(2));

  return {
    r: twoDigitHexR,
    g: twoDigitHexG,
    b: twoDigitHexB,
    a: twoDigitHexA
  };
};

var hexToDecimal = function hexToDecimal(hex) {
  return parseInt(hex, 16);
};

var hexesToDecimals = function hexesToDecimals(_ref) {
  var r = _ref.r,
      g = _ref.g,
      b = _ref.b,
      a = _ref.a;
  return {
    r: hexToDecimal(r),
    g: hexToDecimal(g),
    b: hexToDecimal(b),
    a: +(hexToDecimal(a) / 255).toFixed(2)
  };
};

var isNumeric = function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}; // eslint-disable-line no-restricted-globals, max-len

var formatRgb = function formatRgb(decimalObject, parameterA) {
  var r = decimalObject.r,
      g = decimalObject.g,
      b = decimalObject.b,
      parsedA = decimalObject.a;

  var a = isNumeric(parameterA) ? parameterA : parsedA;

  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
};

/**
 * Turns an old-fashioned css hex color value into a rgb color value.
 *
 * If you specify an alpha value, you'll get a rgba() value instead.
 *
 * @param The hex value to convert. ('123456'. '#123456', ''123', '#123')
 * @param An alpha value to apply. (optional) ('0.5', '0.25')
 * @return An rgb or rgba value. ('rgb(11, 22, 33)'. 'rgba(11, 22, 33, 0.5)')
 */
var hexToRgba = function hexToRgba(hex, a) {
  var hashlessHex = removeHash(hex);
  var hexObject = parseHex(hashlessHex);
  var decimalObject = hexesToDecimals(hexObject);

  return formatRgb(decimalObject, a);
};

