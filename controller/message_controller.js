require("dotenv").config();

const getUser = async (req, res) => {
  try {
    console.log("user-fetched");
  } catch (error) {
    console.log(
      "Can't get user email data ",
      error.message
    );
    res.send(error.message);
    console.log(error);
  }
};

module.exports = { getUser };
