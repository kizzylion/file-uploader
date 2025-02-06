const indexController = {
  getLandingPage: (req: any, res: any) => {
    res.render("index");
  },
  getSignupPage: (req: any, res: any) => {
    res.render("auth/signup");
  },
};

export default indexController;
