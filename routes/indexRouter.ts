const { Router } = require("express");
const routes = Router();

routes.get("/", (req: any, res: any) => {
  res.render("index");
});

routes.get("/signup", (req: any, res: any) => {
  res.render("auth/signup");
});

module.exports = routes;
