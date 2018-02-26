# SSM Parameter Env

Supply your environment with the [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-paramstore.html)

**FYI** This library is currently not published to npm. If you want to try it out and give feedback you will have to install it with the following command:

`yarn install @n1ru4l/ssm-parameter-env@https://github.com/n1ru4l/ssm-parameter-env.git`

## Usage Example (lambda)

```js
"use strict";
const AWS = require("aws-sdk");
const ssm = new AWS.SSM();
const createGetEnvironment = require("@n1ru4l/ssm-parameter-env");
const expect = require("expect");

// You would probably use process.env
const env = {
  MY_SCURR: "ssm:/Scurr/Burr/Eagle",
  MY_BAZZ: "Passthrough value"
};

// Create outside of handler to use in-memory caching (default is 5 minutes)
const getEnvironment = createGetEnvironment({
  env,
  ssm,
  expires: 5 * 60 * 1000
});

module.exports.handler = (event, context, callback) => {
  getEnvironment().then(env => {
    expect(env).toEqual({
      MY_SCURR: "TOP SECRET VALUE",
      MY_BAZZ: "Passthrough value"
    }); // true

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: env.MY_SCURR
      })
    };
    callback(null, response);
  });
};
```

More documentation will follow soon. For more detail you can take a look at the [tests](./src/index.test.js) 😇.

## How to use with serverless(-offline)

This plugin should work out of the box with serverless-offline.
You should not uny any environment variables prefixed with `ssm:` in your local development environment to prevent any request to AWS.

## Required Permissions

[This document](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html) should cover all info about permissions.
You will have to give permissions to your target for the following actions: `ssm:GetParameters` and `kms:Decrypt`.
I recommend to group your ssm parameters with a prefix (e.g. `my-project-production/database-password`). By doing so you can restrict the `ssm:GetParameters` to a subset of ssm parameters that start with the shared prefix (e.g. `my-project-production/*`).

**I use serverless and I don't care, I am testing and I just wanne copy paste stuff**

If you do not care about fine graned access control just use these iamRoleStatements (serverless):

```yml
  iamStatements:
    - Effect: Allow
      Action:
        - ssm:GetParameters
      Resource: *
    - Effect: Allow
      Action:
        - kms:Decrypt
      Resource: *
```

## Roadmap

* [x] Make it compatible to serverless framework (offline mode)
* [ ] Test in Real World Application
* [ ] Publish to npm
* [x] Implement caching

## Useful Links

* [You should use ssm parameter store over lambda env variables](https://hackernoon.com/you-should-use-ssm-parameter-store-over-lambda-env-variables-5197fc6ea45b)

* [AWS Lambda lifecycle and in-memory caching](https://medium.com/@tjholowaychuk/aws-lambda-lifecycle-and-in-memory-caching-c9cd0844e072)
