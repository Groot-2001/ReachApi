const express = require("express");
const router = express.Router();

// MessageRoutes googleapis
router.get("/user/:email", getUser);

module.exports = router;
