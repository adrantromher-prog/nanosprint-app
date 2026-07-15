module.exports = {
  apps: [{
    name: "nanosprint",
    script: "server.mjs",
    cwd: "/home/nanosprint/nanosprint-app",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production"
    }
  }]
};
