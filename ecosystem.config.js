module.exports = {
  apps: [
    {
      name: "ai-chat-platform",
      script: "npm",
      args: "start",
      instances: process.env.NODE_ENV === "production" ? "max" : 1,
      exec_mode: process.env.NODE_ENV === "production" ? "cluster" : "fork",
      watch: process.env.NODE_ENV !== "production",
      ignore_watch: ["node_modules", ".next", ".git", "logs"],
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024",
    },
  ],

  deploy: {
    production: {
      user: "node",
      host: "your-server.com",
      ref: "origin/main",
      repo: "https://github.com/zero2005x/Chatgpt_Reverse_Proxy.git",
      path: "/var/www/ai-chat-platform",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
    },
  },
};
