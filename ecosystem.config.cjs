module.exports = {
  apps: [
    {
      name: "bluesky-swahili-app",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8888,
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: false,
      watch: false,
      max_memory_restart: "500M",
    },
  ],
};
