const express = require('express');
const mongoose = require("mongoose");
const routes = require("./routes/routes");
const keys = require("./config/keys");
const app = express();

app.set('view engine', 'ejs');
app.set('views', 'templates');

app.use("/", routes);

// //connect to mongodb atlas
mongoose.connect(keys.mongoDB.mongodbURI);

app.listen(3000, () => {
    console.log("Listening...");
})