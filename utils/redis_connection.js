const redis = require("ioredis");
const {
  basic_config,
  max_request,
} = require("../config/redis_config");

require("dotenv").config();

//creating new Redis Instance
const connect = new redis(basic_config, max_request);

//getting the token based on email-id as key
const GetToken = async (email) => {
  try {
    // redis data structure looks like below
    // myemailId : "ksdkdkjkdkdjkjkdj"
    const token = await connect.get(email);
    return token;
  } catch (error) {
    console.error(
      `Error retrieving token from Redis for email ${email}:`,
      error.message
    );
    throw new Error(
      `Error retrieving token from Redis for email ${email}.`
    );
  }
};

module.exports = {
  connect,
  GetToken,
};
