import express, { Router } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import routePowerMeter from "./routes/routePowerMeter";
import routeChannels from "./routes/routeChannels";
import routeMeasurements from "./routes/routeMeasurements";
import routeAssets from "./routes/routeAssets";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", `${process.env.NODE_ENV ? process.env.NODE_ENV : ""}.env`) });
const app = express();

const port = process.env.PORT || 8080;

if (!fs.existsSync(path.resolve(__dirname, "..", process.env.CONFIG_DB_FILE as string))) {
	throw new Error("The config.sqlite file not exists in path " + process.env.CONFIG_DB_FILE);
}
const jsonParser = bodyParser.json();
app.use(jsonParser);

app.use("/api/admin/crud/power_meter", routePowerMeter);
app.use("/api/admin/crud/channels", routeChannels);
app.use("/api/admin/crud/assets", routeAssets);
app.use("/api/measurements", routeMeasurements);

const FILE = fs.readFileSync("./openapi.json", "utf8");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const swaggerDocument = JSON.parse(FILE);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const router = Router();
router.get("/json", (_req, res) => {
	res.send(swaggerDocument);
});
app.use("/api", router);

const server = app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`App is running at http://localhost:${port}`);
});

export default { app, server };
