import { getFeeValue } from "@hermeznetwork/hermezjs/src/tx-utils";
import { getTokenAmountString } from "@hermeznetwork/hermezjs/src/utils";

import { MAX_TOKEN_DECIMALS } from "../constants";

const CurrencySymbol = {
  USD: {
    symbol: "$",
    code: "USD",
  },
  EUR: {
    symbol: "€",
    code: "EUR",
  },
  CNY: {
    symbol: "¥",
    code: "CNY",
  },
  JPY: {
    symbol: "¥",
    code: "JPY",
  },
  GBP: {
    symbol: "£",
    code: "GBP",
  },
};

/**
 * Gets the string representation of a token amount with fixed decimals
 * @param {string} amount - Amount to be be converted in a bignumber format
 * @param {Number} decimals - Decimals that the amount should have in its string representation
 * @returns {string}
 */
function getFixedTokenAmount(amount, decimals) {
  if (amount === undefined || decimals === undefined) {
    return undefined;
  }

  // We can lose precision as there will never be more than MAX_DECIMALS_UNTIL_ZERO_AMOUNT significant digits
  const balanceWithDecimals = Number(amount) / Math.pow(10, decimals);

  return trimZeros(balanceWithDecimals, MAX_TOKEN_DECIMALS).toString();
}

/**
 * Converts a USD amount to the preferred currency
 *
 * @param {Number} usdAmount
 * @param {String} preferredCurrency - User preferred currency
 * @param {Object} fiatExchangeRates - Exchange rates for all the supported currencies in the app
 *
 * @returns {Number}
 */
function getAmountInPreferredCurrency(usdAmount, preferredCurrency, fiatExchangeRates) {
  if (preferredCurrency === CurrencySymbol.USD.code) {
    return usdAmount;
  }

  return usdAmount * fiatExchangeRates[preferredCurrency];
}

/**
 * Converts a token amount to a new amount but in the user preferred currency
 *
 * @param {string} amount - The amount to be be converted
 * @param {number} usdTokenExchangeRate - Current USD exchange rate for the token
 * @param {string} preferredCurrency - User preferred currency
 * @param {Object} fiatExchangeRates - Exchange rates for all the supported currencies in the app
 *
 * @returns {Number}
 */
function getTokenAmountInPreferredCurrency(
  amount,
  usdTokenExchangeRate,
  preferredCurrency,
  fiatExchangeRates
) {
  const usdAmount = Number(amount) * usdTokenExchangeRate;

  if (!fiatExchangeRates) {
    return undefined;
  }

  return getAmountInPreferredCurrency(usdAmount, preferredCurrency, fiatExchangeRates);
}

/**
 * Converts a fee index to USD
 * @param {Number} feeIndex - The fee index from the Hermez protocol
 * @param {BigNumber} amount - Amount in BigNumber string value
 * @param {Object} token - Token object
 * @returns {String} Amount in USD
 */
function getFeeInUsd(feeIndex, amount, token) {
  if (!feeIndex) {
    return "-";
  }
  const feeInToken = Number(getTokenAmountString(getFeeValue(feeIndex, amount), token.decimals));
  const feeInFiat = feeInToken * token.USD;
  return feeInFiat;
}

/**
 * Convert token amount to preferred currency
 * @param {String} tokenAmount - Token amount
 * @param {Object} token - Token data
 * @param {string} preferredCurrency - User preferred currency
 * @param {Object} fiatExchangeRates - Exchange rates for all the supported currencies in the app
 * @returns {Number} Amount in preferred currency
 */
function convertTokenAmountToFiat(tokenAmount, token, preferredCurrency, fiatExchangeRates) {
  const fixedTokenAmount = getFixedTokenAmount(tokenAmount, token.decimals);
  return getTokenAmountInPreferredCurrency(
    fixedTokenAmount,
    token.USD,
    preferredCurrency,
    fiatExchangeRates
  );
}

/**
 * Trim leading and trailing zeros
 * @param {Number} amount - Amount to trim
 * @param {Number} decimals - Decimals that the amount should have
 * @returns {Number}
 */
function trimZeros(amount, decimals) {
  return Number(amount.toFixed(decimals));
}

export {
  CurrencySymbol,
  getFixedTokenAmount,
  getAmountInPreferredCurrency,
  getTokenAmountInPreferredCurrency,
  getFeeInUsd,
  convertTokenAmountToFiat,
  trimZeros,
};
