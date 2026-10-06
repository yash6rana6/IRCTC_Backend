const asyncHandler = require("express-async-handler");
const { BadRequestError } = require("../utils/error");
const authService = require("../services/auth.service");
const config = require("../config/index");

exports.sendOTP = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw new BadRequestError("All fields are mandatory");
  }

  if (password !== confirmPassword) {
    throw new BadRequestError("Passwords do not match");
  }

  const { otpSessionId } = await authService.sendOTP(
    email,
    firstName,
    lastName,
    password,
  );
  res
    .cookie("otpSessionId", otpSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: config.OTP_TTL * 1000, // 5 minutes
    })
    .status(200)
    .json({
      success: true,
      message: "OTP sent successfully",
    });
});
