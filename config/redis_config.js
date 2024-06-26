module.exports = {
  basic_config: {
    port: process.env.redis_port,
    host: process.env.redis_host,
    password: process.env.redis_pass,
  },
  max_request: {
    maxRetriesPerRequest: null,
  },
};
