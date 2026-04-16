import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { createPresignedUpload } from "../services/storage.service";

export const mediaRouter = Router();

mediaRouter.post("/upload-url", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      mimeType: z.string().min(1),
      extension: z.string().min(1)
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await createPresignedUpload({
    userId: req.authUser!.userId,
    mimeType: parsed.data.mimeType,
    extension: parsed.data.extension
  });
  res.json(result);
});
