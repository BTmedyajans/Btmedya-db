import { WorkflowEntrypoint } from "cloudflare:workers";

export class BtmedyaWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const payload = event.payload || {};
    const notifyStep = async (stepName, status) => {
      try {
        if (!this.env.WORKFLOW_STATUS) return;
        const id = this.env.WORKFLOW_STATUS.idFromName(event.instanceId);
        const stub = this.env.WORKFLOW_STATUS.get(id);
        await stub.updateStep(stepName, status);
      } catch {}
    };

    await notifyStep("hazirla", "running");
    const prepared = await step.do("hazirla", async () => ({
      action: String(payload.action || "content-review"),
      newsId: payload.newsId ? Number(payload.newsId) : null,
      mediaKey: payload.mediaKey ? String(payload.mediaKey) : null,
      requiresApproval: payload.requiresApproval !== false,
      preparedAt: new Date().toISOString(),
    }));

    await notifyStep("hazirla", "completed");
    let approval = { approved: true, comment: "Otomatik akış" };

    if (prepared.requiresApproval) {
      await notifyStep("onay-bekle", "waiting");
      const eventResult = await step.waitForEvent("onay-bekle", {
        type: "btmedya-approval",
        timeout: "24 hours",
      });
      approval = eventResult.payload || { approved: false };
      await notifyStep("onay-bekle", "completed");
    }

    await notifyStep("uygula", "running");
    await step.do("uygula", async () => {
      if (!approval.approved) {
        console.log("[BTMEDYA Workflow] Akış reddedildi", {
          action: prepared.action,
          newsId: prepared.newsId,
          comment: approval.comment || "",
        });
        return { ok: false, status: "rejected" };
      }

      if (prepared.newsId && this.env.DB) {
        await this.env.DB.prepare(
          "UPDATE news SET updated_at=? WHERE id=?"
        ).bind(new Date().toISOString(), prepared.newsId).run();
      }

      console.log("[BTMEDYA Workflow] Akış tamamlandı", {
        action: prepared.action,
        newsId: prepared.newsId,
        mediaKey: prepared.mediaKey,
      });

      return { ok: true, status: "completed" };
    });
    await notifyStep("uygula", "completed");

    return {
      ok: approval.approved !== false,
      action: prepared.action,
      newsId: prepared.newsId,
      mediaKey: prepared.mediaKey,
      approval,
    };
  }
}
