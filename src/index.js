"use strict";

const pickBy = require("lodash.pickby");
const findKey = require("lodash.findkey");
const objectValues = require("object.values");
const once = require("lodash.once");

const defaultExpire = 5 * 60 * 1000;

function isSsmValue(value) {
  return String(value).startsWith("ssm:");
}

function filterSsmKeys(object) {
  return pickBy(object, isSsmValue);
}

function createGetEnvironment({ env, ssm, expires = defaultExpire }) {
  const ssmParameters = filterSsmKeys(env);

  // If there are no ssm params we do not need to refresh them
  if (Object.keys(ssmParameters).length === 0) {
    return function getEnvironment() {
      return Promise.resolve(env);
    };
  }

  const expireIn = Boolean(expires) && expires > 0 ? parseInt(expires, 10) : 0;
  let expireDate = null;

  function resetExpireDate() {
    expireDate = new Date(new Date().getTime() + expireIn);
  }

  const ssmParameterNames = objectValues(ssmParameters).map(value =>
    value.replace("ssm:", "")
  );

  function fetchParameters() {
    return ssm
      .getParameters({
        Names: ssmParameterNames,
        WithDecryption: true
      })
      .promise()
      .then(({ Parameters, InvalidParameters }) => {
        if (InvalidParameters.length > 0) {
          let parameterMappings = InvalidParameters.map(name => {
            const identifier = `ssm:${name}`;
            const envVariable = findKey(
              ssmParameters,
              value => value === identifier
            );
            return `${envVariable} (${identifier})`;
          });
          let message = "Failed to receive the following parameters: ";
          message += parameterMappings.join(", ");
          // prettier-ignore
          const error = new Error(message)
          return Promise.reject(error);
        }
        const result = {};
        Parameters.forEach(({ Name: name, Value: value }) => {
          const identifier = `ssm:${name}`;
          const key = findKey(ssmParameters, value => value === identifier);
          result[key] = value;
        });
        return Object.assign({}, env, result);
      });
  }

  let cachedFetchParameters = once(fetchParameters);
  resetExpireDate();

  return function getEnvironment() {
    if (new Date() > expireDate) {
      cachedFetchParameters = once(fetchParameters);
      resetExpireDate();
    }
    return cachedFetchParameters();
  };
}

module.exports = createGetEnvironment;
