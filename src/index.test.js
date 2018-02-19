"use strict";

const getEnvironment = require(".");

test("it pass through an environment object that contains no ssm parameters", done => {
  expect.assertions(1);
  const env = {
    MY_FOO: "test",
    MY_SCURR: "wezz"
  };
  getEnvironment({ env }).then(data => {
    expect(data).toEqual({
      MY_FOO: "test",
      MY_SCURR: "wezz"
    });
    done();
  });
});

test("it calls the ssm object with the right parameters", done => {
  expect.assertions(1);
  const env = {
    MY_FOO: "ssm:/MyVariable/Foo",
    MY_SCURR: "wezz"
  };
  const ssm = {
    getParameters(params) {
      expect(params).toEqual({
        Names: ["/MyVariable/Foo"],
        WithDecryption: true
      });
      return {
        promise() {
          return Promise.resolve({
            Parameters: [
              {
                Name: "/MyVariable/Foo",
                Type: "SecureString",
                Value: "cheese",
                Version: 1
              }
            ],
            InvalidParameters: []
          });
        }
      };
    }
  };

  getEnvironment({ env, ssm })
    .catch(() => null)
    .then(() => {
      done();
    });
});

test("it can resolve and map the values from ssm correctly", done => {
  expect.assertions(1);
  const env = {
    MY_FOO: "ssm:/MyVariable/Foo",
    MY_SCURR: "wezz"
  };
  const ssm = {
    getParameters: () => ({
      promise: () =>
        Promise.resolve({
          Parameters: [
            {
              Name: "/MyVariable/Foo",
              Type: "SecureString",
              Value: "cheese",
              Version: 1
            }
          ],
          InvalidParameters: []
        })
    })
  };
  getEnvironment({ env, ssm })
    .then(data => {
      expect(data).toEqual({
        MY_FOO: "cheese",
        MY_SCURR: "wezz"
      });
      done();
    })
    .catch(done);
});

test("it rejects if there is an invalid parameter", done => {
  expect.assertions(1);
  const env = {
    MY_FOO: "ssm:/MyVariable/Foo",
    MY_SCURR: "wezz"
  };
  const ssm = {
    getParameters: () => ({
      promise: () =>
        Promise.resolve({
          Parameters: [],
          InvalidParameters: ["/MyVariable/Foo"]
        })
    })
  };
  getEnvironment({ env, ssm }).catch(err => {
    // prettier-ignore
    expect(err.message).toEqual("Failed to receive the following parameters: MY_FOO (ssm:/MyVariable/Foo)")
    done();
  });
});
