//Dependencies
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

//Express App
const app = express();

//All Middlewares
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "any_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

//All Routes
app.use("/api/mail", router);

//handling 404 error
app.use("*", (req, res, next) => {
  console.error(req.path);
  console.error(req.params);
  res
    .status(404)
    .json("404,Sorry we couldn't find that page");
  next();
});

// body parser error catcher
app.use((err, req, res, next) => {
  if (err) {
    console.error(err.type);
    res.status(400).json({ error: "error parsing data" });
  } else {
    next();
  }
});

app.listen(process.env.PORT, () => {
  console.log(
    `Server is running on Port: http://localhost:${process.env.PORT}`
  );
});
