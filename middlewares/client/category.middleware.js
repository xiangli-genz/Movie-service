const Category = require("../../models/category.model");
const categoryHelper = require("../../helpers/category.helper");

module.exports.list = async (req, res, next) => {
  try {
    const categoryList = await Category.find({
      status: "active"
    })

    const categoryTree = categoryHelper.buildCategoryTree(categoryList);

    res.locals.categoryList = categoryTree;

    next();
  } catch (error) {
    console.error('Error in category middleware:', error);
    res.locals.categoryList = [];
    next();
  }}