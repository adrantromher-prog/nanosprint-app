module.exports = {
  apps: [{
    name: "nanosprint",
    script: "server.mjs",
    cwd: "/home/nanosprint/nanosprint-app",
    env: {
      NODE_ENV: "production"
    }
  }]
};