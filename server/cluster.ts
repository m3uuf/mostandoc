/**
 * Node.js Cluster mode for production.
 * Spawns one worker per CPU core, each running the full Express server.
 * Automatic restart on worker crash.
 *
 * Usage: NODE_ENV=production node dist/cluster.cjs
 * Or set CLUSTER_WORKERS=4 to specify worker count.
 */
import cluster from "node:cluster";
import os from "node:os";

const numWorkers = parseInt(process.env.CLUSTER_WORKERS || "", 10) || os.cpus().length;

if (cluster.isPrimary) {
  console.log(`[cluster] Primary ${process.pid} starting ${numWorkers} workers...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(`[cluster] Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    // Restart crashed workers
    cluster.fork();
  });

  cluster.on("online", (worker) => {
    console.log(`[cluster] Worker ${worker.process.pid} is online`);
  });
} else {
  // Workers run the actual server
  import("./index.cjs");
}
