import { package_add } from "../actions/types";

export const addPackage = (pkg) => {
  return {
    type: package_add,
    package: pkg,
  };
};
