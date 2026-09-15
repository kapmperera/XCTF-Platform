import { auth_signin, auth_signout } from "./types";

export const signin = (_email) => {
  return {
    type: auth_signin,
    email: _email,
  };
};

export const signout = (_id) => {
  return {
    type: auth_signout,
  };
};
