// PM2 Configuration for Production
// This ensures the server never dies and auto-restarts on failures

module.exports = {
  apps: [
    {
      name: 'portfolio-backend',
      script: './dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      autorestart: true, // Auto-restart on crash
      watch: false, // Don't watch in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart strategies
      min_uptime: '10s', // Minimum uptime before considering healthy
      max_restarts: 10, // Max restarts within 1 minute
      restart_delay: 4000, // Delay between restarts (ms)

      // Advanced features
      kill_timeout: 5000, // Time to wait before force killing
      wait_ready: true, // Wait for app to be ready before considering it online
      listen_timeout: 10000, // Time to wait for app to listen

      // Graceful shutdown
      shutdown_with_message: true,

      // Health monitoring
      merge_logs: true,

      // Resource limits
      instance_var: 'INSTANCE_ID',

      // Cron restart (optional - restart every day at 3 AM)
      cron_restart: '0 3 * * *',

      // Auto-restart on file change in development
      ignore_watch: ['node_modules', 'logs', 'coverage'],

      // Advanced monitoring
      pmx: true,
      automation: false,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-git-repo',
      path: '/var/www/portfolio-backend',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
