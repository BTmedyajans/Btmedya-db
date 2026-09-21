import { WorkflowEntrypoint } from "cloudflare:workers";

export class BtmedyaWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const payload = event.payload || {};

    const prepared = await step.do("hazirla", async () => ({
      action: String(payload.action || "content-review"),
      newsId: payload.newsId ? Number(payload.newsId) : null,
      mediaKey: payload.mediaKey ? String(payload.mediaKey) : null,
      requiresApproval: payload.requiresApproval !== false,
      preparedAt: new Date().toISOString(),
    }));

    let approval = { approved: true, comment: "Otomatik akış" };

    if (prepared.requiresApproval) {
      const eventResult = await step.waitForEvent("onay-bekle", {
        type: "btmedya-approval",
        timeout: "24 hours",
      });
      approval = eventResult.payload || { approved: false };
    }

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

    return {
      ok: approval.approved !== false,
      action: prepared.action,
      newsId: prepared.newsId,
      mediaKey: prepared.mediaKey,
      approval,
    };
  }
}
