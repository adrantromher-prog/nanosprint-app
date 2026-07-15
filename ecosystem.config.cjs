module.exports = {
  apps: [{
    name: "nanosprint",
    script: "server.mjs",
    cwd: "/home/nanosprint/nanosprint-app",
    instances: 2,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production"
    }
  }]
};
