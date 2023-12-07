import { Router } from "express";
import power_meter from "../models/power_meter";
import Joi from "joi";
import { Database } from "sqlite3";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";
import { runQuery, getDBFilePath, getMeasurementsFromPowerMeter } from "../../../powermeter-utils/src/utils/DBUtils";
import { PowerMeter } from "../../../powermeter-utils/src/utils/types";
const router = Router();

/**
 * Get all powermeter from DB
 */
router.get("/", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	if (req.query.first && req.query.rowcount) {
		db.all("select * from power_meter limit ? offset ?", [parseInt(req.query.rowcount as string), parseInt(req.query.first as string)], (err, rows) => {
			if (err) {
				res.send(JSON.stringify({ "error": err.message }));
			} else {
				res.send(rows);
			}
			db.close();
		});
	} else {
		db.all("select * from power_meter", (err, rows) => {
			if (err) {
				res.send(JSON.stringify({ "error": err.message }));
			} else {
				res.send(rows);
			}
			db.close();
		});
	}
});

/**
 * Get count of powermeter
 */
router.get("/count", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select count(*) as count from power_meter", (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Get powermeter by ID
 */
router.get("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select * from power_meter where id = ? ", [req.params.id], (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Delete powermeter by ID
 */
router.delete("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	db.run("delete from channels where power_meter_id = ? ", [req.params.id], async function (err) {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
			db.close();
		} else {
			let filePath = "";
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const row = await runQuery(db, "select ip_address from power_meter where id = ?", [req.params.id]);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (row && row.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				filePath = getDBFilePath(row[0].ip_address as string);
			}
			db.run("delete from power_meter where id = ? ", [req.params.id], function (delErr) {
				if (delErr) {
					res.send(JSON.stringify({ "error": delErr.message }));
				} else {
					if (fs.existsSync(filePath)) {
						try {
							fs.rmSync(filePath, { recursive: true });
						} catch (syncErr) {
							// eslint-disable-next-line
							console.error(syncErr);
						}
					}
					res.send(JSON.stringify({ count: this.changes }));
				}
				db.close();
			});

		}
	});
});

interface PowerMeterBody extends PowerMeter {
	asset_name: string;
	ip_address: string;
	port: number;
	time_zone: string;
	enabled: boolean;
	power_meter_name: string;

}
/**
 * Update powermeter by ID
 */
router.put("/:id", (req, res) => {
	const jsonObj: unknown = req.body as unknown;
	if (typeof jsonObj !== "object") {
		throw new Error("Body not an object");
	}
	const valid: Joi.ValidationResult = power_meter.validate(jsonObj);
	if (!valid.error) {
		const powerMeterBody: PowerMeterBody = valid.value as PowerMeterBody;
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("update power_meter set power_meter_name = ?, ip_address = ?, port = ?, time_zone = ?, enabled = ? where id = ? ",
			[
				powerMeterBody.power_meter_name,
				powerMeterBody.ip_address,
				powerMeterBody.port,
				powerMeterBody.time_zone,
				powerMeterBody.enabled,
				req.params.id,
			], function (err) {
				if (err) {
					res.send(JSON.stringify({ "error": err.message }));
				} else {
					res.send(JSON.stringify({ count: this.changes }));
				}
				db.close();
			});
	} else {
		res.status(400).send({ message: valid.error });
	}
});

/**
 * Create powermeter
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post("/", async (req, res) => {
	const jsonObj: unknown = req.body as unknown;
	if (typeof jsonObj !== "object") {
		throw new Error("Body not an object");
	}
	const valid: Joi.ValidationResult = power_meter.validate(jsonObj);
	if (!valid.error) {
		const powerMeterBody: PowerMeterBody = valid.value as PowerMeterBody;
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const rows = await runQuery(db, "select * from power_meter where ip_address=?", [powerMeterBody.ip_address]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (rows && rows.length > 0) {
			res.status(400).send({ message: "Duplicated IP address" });
		} else {
			db.run("insert into power_meter (power_meter_name, ip_address, port, time_zone, enabled) values (?,?,?,?,?)",
				[
					powerMeterBody.power_meter_name,
					powerMeterBody.ip_address,
					powerMeterBody.port,
					powerMeterBody.time_zone,
					powerMeterBody.enabled,
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
				], async function (err) {
					if (err) {
						res.send(JSON.stringify({ "error": err.message }));
					} else {
						const lastID = this.lastID;
						const message: { message?: string; lastID?: number; }[] = [];
						message.push({ lastID });
						const insertMoment = dayjs();
						const filePath = (process.env.WORKDIR as string);
						const subdir = path.join(filePath, powerMeterBody.ip_address);
						if (!fs.existsSync(subdir)) {
							fs.mkdirSync(subdir, { recursive: true });
						}
						const dbFile = path.join(subdir, insertMoment.format("YYYY-MM") + "-monthly.sqlite");
						let measurementsDB: Database;
						try {
							if (!fs.existsSync(dbFile)) {
								measurementsDB = new Database(dbFile);
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
								const createResult = await runQuery(measurementsDB, `CREATE TABLE "Measurements" ("id" INTEGER NOT NULL,"channel" INTEGER,"measured_value" REAL,"recorded_time" INTEGER, PRIMARY KEY("id" AUTOINCREMENT))`, []);
								// eslint-disable-next-line
								console.log(createResult);
							} else {
								measurementsDB = new Database(dbFile);
							}
							const channels: string[] = [];
							for (let i: number = 1; i <= 12; i++) {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
								const channelResult = await runQuery(db, "insert into channels (power_meter_id, channel, channel_name, enabled) values (?,?,?,?)", [lastID, i, `ch${i}`, true]);
								/// eslint-disable-next-line no-console
								//console.log(channelResult);
								channels.push(i.toString());
							}
							measurementsDB.close();
							const result = await getMeasurementsFromPowerMeter(dayjs(), powerMeterBody, channels);
							// eslint-disable-next-line no-console
							console.log(result);
						} catch (createErr) {
							// eslint-disable-next-line no-console
							console.error(dayjs().format(), createErr);
							if (createErr) {
								// eslint-disable-next-line @typescript-eslint/no-base-to-string
								message.push({ message: createErr.toString() });
							}
						}

						res.send(JSON.stringify(message));
					}
					db.close();
				});
		}
	} else {
		res.status(400).send({ message: valid.error });
	}
});

export default router;
