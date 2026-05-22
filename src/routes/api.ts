import { Router } from "express";
import { authRouter } from "./auth.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);

apiRouter.get("/", (_req, res) => {
  res.json({
    message: "fc-order-event-system Auth Service",
    version: "0.1.0",
  });
});
