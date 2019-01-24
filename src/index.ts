import pickBy from "lodash/pickBy";
import findKey from "lodash/findKey";
import once from "lodash/once";
import { SSM } from "aws-sdk";

const defaultExpire = 5 * 60 * 1000;

function isSsmValue(value: string) {
  return value.startsWith("ssm:");
}

interface EnvObject {
  [key: string]: string;
}

function filterSsmKeys(object: EnvObject) {
  return pickBy(object, isSsmValue);
}

export default function createGetEnvironment<T extends EnvObject>({
  env,
  ssm,
  expires = defaultExpire
}: {
  env: T;
  ssm: SSM;
  expires?: number;
}): () => Promise<T> {
  const ssmParameters = filterSsmKeys(env);

  // If there are no ssm params we do not need to refresh them
  if (Object.keys(ssmParameters).length === 0) {
    return function getEnvironment() {
      return Promise.resolve(env);
    };
  }

  const expireIn = Boolean(expires) && expires > 0 ? expires : 0;
  let expireDate: null | Date = null;

  function resetExpireDate() {
    expireDate = new Date(new Date().getTime() + expireIn);
  }

  const ssmParameterNames = Object.values<string>(ssmParameters).map(value =>
    value.replace("ssm:", "")
  );

  async function fetchParameters() {
    const { Parameters, InvalidParameters } = await ssm
      .getParameters({
        Names: ssmParameterNames,
        WithDecryption: true
      })
      .promise();

    if (InvalidParameters && InvalidParameters.length > 0) {
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
    const result: EnvObject = {};
    Parameters &&
      Parameters.forEach(({ Name: name, Value: value }) => {
        const identifier = `ssm:${name}`;
        const key = findKey(ssmParameters, value => value === identifier);
        if (key && value) {
          result[key] = value;
        }
      });
    return Object.assign({}, env, result);
  }

  let cachedFetchParameters = once(fetchParameters);
  resetExpireDate();

  return function getEnvironment() {
    if (!expireDate || new Date() > expireDate) {
      cachedFetchParameters = once(fetchParameters);
      resetExpireDate();
    }
    return cachedFetchParameters();
  };
}
