"use strict";

const pickBy = require("lodash.pickby");
const findKey = require("lodash.findkey");
const objectValues = require("object.values");

function isSsmValue(value) {
  return String(value).startsWith("ssm:");
}

function filterSsmKeys(object) {
  return pickBy(object, isSsmValue);
}

function getEnvironment({ env, ssm }) {
  return new Promise((resolve, reject) => {
    const ssmParameters = filterSsmKeys(env);
    if (Object.keys(ssmParameters).length === 0) {
      return resolve(env);
    }
    const ssmParameterNames = objectValues(ssmParameters).map(value =>
      value.replace("ssm:", "")
    );
    ssm
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
          return reject(error);
        }
        const result = {};
        Parameters.forEach(({ Name, Value }) => {
          const identifier = `ssm:${Name}`;
          const key = findKey(ssmParameters, value => value === identifier);
          result[key] = Value;
        });
        resolve(Object.assign({}, env, result));
      });
  });
}

module.exports = getEnvironment;
