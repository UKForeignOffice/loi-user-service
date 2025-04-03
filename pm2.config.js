module.exports = {
  apps : [
    {
      name      : 'user',
      script    : "server.js",
      instances : "max",
      exec_mode : "cluster"
    }
  ]
}
