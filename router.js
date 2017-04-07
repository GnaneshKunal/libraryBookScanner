const app = require('express').Router();

module.exports = app;


app.get('/', (req, res, next) => {
    res.status(200).send("You can get details of your book by a GET request to its id");
})

app.get('/:id', (req, res, next) => {
    let id = req.params.id;
    res.status(200).json(id);
});