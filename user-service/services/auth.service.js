const { ConflictError, BadRequestError } = require("../utils/error");
const {sendOTPEmail} = require("../utils/email");
const {generateAndStoreOTP, verifyOtp} = require("../utils/otp");
const bcrypt = require("bcrypt");
const { prisma } = require("../config/prisma");


const sendOTP = async(email, firstName, lastName,  password) => {
    const existingUser = await prisma.user.findUnique({
        where : {email}
    })

    if(existingUser){
        throw new ConflictError("User with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const meta = {firstName, lastName, email, password: hashedPassword};
    const {otp,otpSessionId} = await generateAndStoreOTP(meta);
    await sendOTPEmail(email, otp);
    return {otpSessionId};
}

const verifyOTP = async(otp,otpSessionID) => {
    const meta = await verifyOtp(otp,otpSessionId);
    if(meta == null){
        throw new BadRequestError("Invalid or expired OTP","OTP_INVALID");
    }
    const user = await prisma.user.create({
        data:{
            firstName:meta.firstName,
            lastName:meta.lastName,
            email:meta.email,
            password:meta.hashedPassword
        }
    })

    await verifyOtpEmail(meta);
    return user;
}

module.exports = {sendOTP,verifyOTP}