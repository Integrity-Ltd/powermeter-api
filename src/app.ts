import express, { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from "fs";
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import routePowerMeter from './routes/routePowerMeter';
import routeChannels from './routes/routeChannels';
import routeMeasurements from './routes/routeMeasurements'
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, "..", `${process.env.NODE_ENV ? process.env.NODE_ENV as string : ""}.env`) });
const app = express();

const port = process.env.PORT || 8080

if (!fs.existsSync(path.resolve(__dirname, "..", process.env.CONFIG_DB_FILE as string))) {
    throw new Error("The config.sqlite file not exists in path " + process.env.CONFIG_DB_FILE);
}
const jsonParser = bodyParser.json();
app.use(jsonParser);

app.use("/api/admin/crud/power_meter", routePowerMeter);
app.use("/api/admin/crud/channels", routeChannels);
app.use("/api/measurements", routeMeasurements);

const file = fs.readFileSync('./openapi.json', 'utf8')
const swaggerDocument = JSON.parse(file)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const router = Router();
router.get("/json", (req, res) => {
    res.send(swaggerDocument);
})
app.use('/api', router);


const server = app.listen(port, () => {
    console.log(`App is running at http://localhost:${port}`);
})

export default { app, server };