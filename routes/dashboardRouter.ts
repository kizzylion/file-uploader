import { Router } from "express";
const routes = Router();

routes.get("/", (req: any, res: any) => {
  res.render("dashboard");
});

export default routes;
