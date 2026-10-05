const { redisClient } = require("../config/redis");
const { TooManyRequestsError } = require("./error");
const crypto = require("crypto");
const redis = require("../config/redis");
const config = require("../config/index");
const OTP_TTL = parseInt(config.OTP_TTL) || 300;
const HMAC_SECRET = config.OTP_HMAC_SECRET ;

const RATE_MAX = parseInt(config.OTP_RATE_LIMIT) || 5; 

function hmacFor(email, otp) {
    return crypto.createHmac('sha256', HMAC_SECRET).update(email + ":" + otp).digest('hex');
}


async function generateAndStoreOTP(meta) {
    const rateKey = `otp_rate_${meta.email}`;
    const sentCount = parseInt(await redisClient.get(rateKey)) ;
    if (sentCount >= RATE_MAX) {
        throw new TooManyRequestsError("Too many OTP requests."," OTP rate limit exceeded");
    }

    const otp = otpGenerator(6,
        upperCase = false,
        specialChars = false,
        lowerCase = false,
        digits = true
    ); 

    const otpSessionId = crypto.randomUUID();
    const hased = hmacFor(meta.email, otp);
    await redis.set(`otp:${otpSessionId}`, JSON.stringify({
        hashedOTP: hased,
        meta,
       
    }), { EX: config.OTP_TTL });
    await redis.incr(rateKey);
    await redis.expire(rateKey, 3600);
    return { otp, otpSessionId };



};