const {ConflictError} = require("../utils/error").ConflictError;
const {sendOTPEmail} = require("../utils/email");
const {generateAndStoreOTP} = require("../utils/otp");
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

module.exports = {sendOTP}