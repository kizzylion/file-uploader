const bcrypt = require("bcryptjs");

const hashPassword = (password: string) => {
  return bcrypt.hashSync(password, 10);
};

const comparePassword = (password: string, hash: string) => {
  return bcrypt.compareSync(password, hash);
};

module.exports = { hashPassword, comparePassword };
