import express, { Express, Request, Response } from "express";

const app: Express = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`server started on ${port}`);
});
