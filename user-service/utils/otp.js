const crypto = require("crypto");
const RedisClient = require("../config/redis");
const { config } = require("../config/index");
const { TooManyRequestsError } = require("./error");

const redis = RedisClient.getInstance();
const ATTEMPT_MAX = parseInt(config.OTP_MAX_VERIFY_ATTEMPTS || '5')

const OTP_TTL = parseInt(config.OTP_TTL) || 300;
const RATE_MAX = parseInt(config.OTP_RATE_MAX) || 5;
const HMAC_SECRET = config.OTP_HMAC_SECRET;

function hmacFor(email, otp) {
    return crypto.createHmac("sha256", HMAC_SECRET).update(`${email}:${otp}`).digest("hex");
}

async function generateAndStoreOTP(meta) {
    const rateKey = `otp_rate_${meta.email}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 3600);
    if (count > RATE_MAX) {
        throw new TooManyRequestsError("Too many OTP requests. Try again later.", "OTP_RATE_LIMIT_EXCEEDED");
    }

    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const otpSessionId = crypto.randomUUID();

    await redis.set(
        `otp:${otpSessionId}`,
        JSON.stringify({ hashedOTP: hmacFor(meta.email, otp), meta }),
        "EX",
        OTP_TTL
    );

    return { otp, otpSessionId };
}

async function verifyOtp(otp,otpSessionId) {
  const rawData = await redis.get(`otp.session:${otpSessionId}`)   
  if(!rawData) return null;

  const {hashedOTP:storedOtp,meta} = JSON.parse(rawData);

  const attemptsKey = `otp.attempts:${meta.email}`;
  const attemptsCount = parseInt(await redis.get(attemptsKey) || '0',10 );
  if(attemptsCount >= ATTEMPT_MAX ){
    throw new TooManyRequestsError("Too many attempt to verify OTP")
  }
  const hashOtp = hmacFor(meta.email,otp);
  if(crypto.timingSafeEqual(Buffer.from(hashOtp,'hex'),
  Buffer.from(storedOtp,'hex'))){
    await redis.del(`otp:session:${otpSessionId}`,attemptsKey);
    await redis.del(`otp-rate:${meta.email}`);
    return meta;

  }else{
    await redis.incr(attemptsKey);
    await redis.expire(attemptsKey,config.OTP_TTL);
    return null;
  }
}


module.exports = { generateAndStoreOTP,verifyOtp };