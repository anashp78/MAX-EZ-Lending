module.exports = {
  apps: [{
    name: 'ezlending',
    script: 'node_modules/.bin/next',
    args: 'start --port 3040',
    cwd: '/var/www/ezlending',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3040,
    },
  }],
}
