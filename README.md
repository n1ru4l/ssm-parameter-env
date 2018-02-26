# SSM Parameter Env

Supply your environment with the [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-paramstore.html)

**FYI** This library is currently not published to npm. If you want to try it out and give feedback you will have to install it with the following command:

`yarn install @n1ru4l/ssm-parameter-env@https://github.com/n1ru4l/ssm-parameter-env.git`

## Usage Example

```js
const AWS = require("aws-sdk");
const ssm = new AWS.SSM();
const getEnvironment = require("@n1ru4l/ssm-parameter-env");
const expect = require("expect");

const env = {
  MY_SCURR: "ssm:/Scurr/Burr/Eagle",
  MY_BAZZ: "Passthrough value"
};

getEnvironment({ env, ssm }).then(env => {
  expect(env).toEqual({
    MY_SCURR: "TOP SECRET VALUE",
    MY_BAZZ: "Passthrough value"
  }); // true
});
```

More documentation will follow soon. For more detail you can take a look at the [tests](./src/index.test.js) 😇.

## Roadmap

* [ ] Make it compatible to serverless framework (offline mode)
* [ ] Test in Real World Application
* [ ] Publish to npm
* [ ] Implement caching

## Useful Links

This package is heavily inspired by [this medium article](https://hackernoon.com/you-should-use-ssm-parameter-store-over-lambda-env-variables-5197fc6ea45b).
