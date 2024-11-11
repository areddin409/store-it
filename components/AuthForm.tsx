import React from "react";

type AuthFormType = {
  type: "sign-in" | "sign-up";
};

const AuthForm = ({ type }: AuthFormType) => {
  return <div>AuthForm: {type}</div>;
};
export default AuthForm;
