module.exports = {
  apps: [
    {
      name: 'wa-flashlogin-demo-server',
      cwd: '/root/wa-flashlogin/examples/basic-express',
      script: 'src/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3060,
        ALLOW_SIMULATE: 'true',
        FLASHLOGIN_SECRET: 'demo-flashlogin-secret-change-in-production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/root/logs/wa-flashlogin-demo-error.log',
      out_file: '/root/logs/wa-flashlogin-demo-out.log',
      merge_logs: true,
    },
  ],
};
