import { describe, expect, it, vi } from "vitest";

vi.mock("express-validator", () => ({
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
}));

vi.mock("../models/userModel.js", () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock("../utils/generateToken.js", () => ({
  generateToken: () => "testtoken",
}));

vi.mock("../utils/response.js", () => ({
  sendSuccess: vi.fn(),
}));

import { User } from "../models/userModel.js";
import { sendSuccess } from "../utils/response.js";
import { login } from "./authController.js";

function runHandler(handler, req) {
  const res = {};
  return new Promise((resolve) => {
    let settled = false;
    handler(req, res, (err) => {
      settled = true;
      resolve({ err, res });
    });
  });
}

describe("authController.login role enforcement", () => {
  it("rejects valid creds when requested role mismatches", async () => {
    User.findOne.mockReturnValue({
      select: () => ({
        role: "customer",
        comparePassword: async () => true,
        toSafeJSON: () => ({ role: "customer" }),
        _id: "u1",
      }),
    });

    const p = runHandler(login, {
      body: { email: "c@x.com", password: "pw", role: "admin" },
    });
    const { err } = await p;

    expect(sendSuccess).not.toHaveBeenCalled();
    expect(err).toBeTruthy();
    expect(err.statusCode).toBe(403);
  });
});

