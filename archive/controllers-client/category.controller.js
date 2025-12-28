const Category = require("../../models/category.model");
const Movie = require("../../models/movie.model");
// const City = require("../../models/city.model");
const moment = require("moment");
const categoryHelper = require("../../helpers/category.helper");

module.exports.list = async (req, res) => {
  // Lấy slug từ params
  const slug = req.params.slug;

  // Tìm danh mục theo slug
  const category = await Category.findOne({
    slug: slug,
    deleted: false,
    status: "active"
  })

  if(category) {
    // Breadcrumb
    const breadcrumb = {
      image: category.avatar,
      title: category.name,
      list: [
        {
          link: "/",
          title: "Trang Chủ"
        }
      ]
    };

    // Tìm danh mục cha
    if(category.parent) {
      const parentCategory = await Category.findOne({
        _id: category.parent,
        deleted: false,
        status: "active"
      })

    if(parentCategory) {
      breadcrumb.list.push({
        link: `/category/${parentCategory.slug}`,
        title: parentCategory.name
      })
    }
    }

    // Thêm danh mục hiện tại
    breadcrumb.list.push({
      link: `/category/${category.slug}`,
      title: category.name
    })
    // End Breadcrumb

    // Danh sách movie
    const listCategoryId = await categoryHelper.getAllSubcategoryIds(category._id);
    const find = {
      category: { $in: listCategoryId },
      deleted: false,
      status: "active"
    };

    const totalMovie = await Movie.countDocuments(find);

    const movieList = await Movie
      .find(find)
      .sort({
        position: "desc"
      })

    for(const item of movieList) {
      item.releaseDateFormat = moment(item.releaseDate).format("DD/MM/YYYY");
    }
    // Hết Danh sách movie

    // Danh sách thành phố
    const cityList = await City.find({});
    // Hết Danh sách thành phố 


    res.render("client/pages/movie-list", {
      pageTitle: "Danh sách movie",
      breadcrumb: breadcrumb,
      category: category,
      movieList: movieList,
      totalMovie: totalMovie,
      cityList: cityList
    });
  } else {
    res.redirect("/");
  }
}
