declare namespace Express {
  interface Request {
    user?: Auth.User;
  }
}
