module.exports = function custom(data) {
  const { res } = this.req;
  res.status(200).json({ success: true, ...data });
};
