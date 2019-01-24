import { SSM } from "aws-sdk";
import lolex from "lolex";
import createGetEnvironment from "../";

test("it pass through an environment object that contains no ssm parameters", done => {
  expect.assertions(1);
  const env = {
    MY_FOO: "test",
    MY_SCURR: "wezz"
  };

  const getEnvironment = createGetEnvironment({ env, ssm: new SSM() });

  getEnvironment().then(data => {
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

  const ssm = new SSM();

  jest.spyOn(ssm, "getParameters").mockImplementation(params => {
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
  });

  const getEnvironment = createGetEnvironment({ env, ssm });

  getEnvironment()
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

  const ssm = new SSM();

  jest.spyOn(ssm, "getParameters").mockImplementation(() => ({
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
  }));

  const getEnvironment = createGetEnvironment({ env, ssm });
  getEnvironment()
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

  const ssm = new SSM();

  jest.spyOn(ssm, "getParameters").mockImplementation(() => ({
    promise: () =>
      Promise.resolve({
        Parameters: [],
        InvalidParameters: ["/MyVariable/Foo"]
      })
  }));

  const getEnvironment = createGetEnvironment({ env, ssm });
  getEnvironment().catch(err => {
    // prettier-ignore
    expect(err.message).toEqual("Failed to receive the following parameters: MY_FOO (ssm:/MyVariable/Foo)")
    done();
  });
});

test("it does not refetch the parameters when they have not expired", done => {
  expect.assertions(0);
  const env = {
    MY_FOO: "ssm:/MyVariable/Foo",
    MY_SCURR: "wezz"
  };
  let counter = 0;

  const ssm = new SSM();

  jest.spyOn(ssm, "getParameters").mockImplementation(() => ({
    promise: () => {
      if (counter === 0) {
        counter++;
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
      } else {
        done.fail("getParameters is called multiple times");
      }
    }
  }));

  const getEnvironment = createGetEnvironment({ env, ssm });
  getEnvironment()
    .then(() => {
      return getEnvironment();
    })
    .then(() => done());
});

test("it does refetch the parameters when they have expired", done => {
  expect.assertions(3);
  const clock = lolex.install();
  const env = {
    MY_FOO: "ssm:/MyVariable/Foo",
    MY_SCURR: "wezz"
  };

  let counter = 0;
  const ssm = new SSM();
  jest.spyOn(ssm, "getParameters").mockImplementation(() => ({
    promise: () => {
      if (counter === 0) {
        counter++;
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
      } else if (counter === 1) {
        counter++;
        return Promise.resolve({
          Parameters: [
            {
              Name: "/MyVariable/Foo",
              Type: "SecureString",
              Value: "cracker",
              Version: 2
            }
          ],
          InvalidParameters: []
        });
      } else if (counter === 2) {
        counter++;
        return Promise.resolve({
          Parameters: [
            {
              Name: "/MyVariable/Foo",
              Type: "SecureString",
              Value: "corgi",
              Version: 3
            }
          ],
          InvalidParameters: []
        });
      } else {
        done.fail("Too many calls");
      }
    }
  }));

  const getEnvironment = createGetEnvironment({ env, ssm });
  getEnvironment()
    .then(env => {
      expect(env).toEqual({
        MY_FOO: "cheese",
        MY_SCURR: "wezz"
      });
      clock.tick(5 * 60 * 1000 + 1);
      return getEnvironment();
    })
    .then(env => {
      expect(env).toEqual({
        MY_FOO: "cracker",
        MY_SCURR: "wezz"
      });

      clock.tick(5 * 60 * 1000 + 1);
      return getEnvironment();
    })
    .then(env => {
      expect(env).toEqual({
        MY_FOO: "corgi",
        MY_SCURR: "wezz"
      });
      clock.uninstall();
      done();
    })
    .catch(err => {
      clock.uninstall();
      done(err);
    });
});
