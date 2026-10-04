import { DurableObject } from "cloudflare:workers";

export class WorkflowStatusDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = {
      currentStep: null,
      stepStatuses: {},
      workflowStatus: "running",
    };

    ctx.blockConcurrencyWhile(async () => {
      this.state.stepStatuses =
        (await ctx.storage.get("stepStatuses")) || {};
      this.state.currentStep =
        (await ctx.storage.get("currentStep")) || null;
      this.state.workflowStatus =
        (await ctx.storage.get("workflowStatus")) || "running";
    });
  }

  async updateStep(stepName, status) {
    this.state.stepStatuses[stepName] = status;
    if (status === "running" || status === "waiting") {
      this.state.currentStep = stepName;
    }

    const values = Object.values(this.state.stepStatuses);
    if (values.length && values.every((s) => s === "completed")) {
      this.state.workflowStatus = "completed";
      this.state.currentStep = null;
    }

    await this.ctx.storage.put("stepStatuses", this.state.stepStatuses);
    await this.ctx.storage.put("currentStep", this.state.currentStep);
    await this.ctx.storage.put("workflowStatus", this.state.workflowStatus);
    this.broadcast();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(this.message()));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws) {
    ws.send(JSON.stringify(this.message()));
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch {}
  }

  broadcast() {
    const message = JSON.stringify(this.message());
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(message); } catch {}
    }
  }

  message() {
    return {
      type: "workflow_update",
      currentStep: this.state.currentStep,
      stepStatuses: this.state.stepStatuses,
      workflowStatus: this.state.workflowStatus,
      timestamp: Date.now(),
    };
  }
}
