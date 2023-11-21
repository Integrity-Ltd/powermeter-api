import { Router } from "express";
import power_meter from "../models/power_meter";
import Joi from "joi";
import { Database } from "sqlite3";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";
import { runQuery, getDBFilePath, getMeasurementsFromPowerMeter } from "../../../powermeter-utils/src/utils/DBUtils";
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
	db.run("delete from channels where power_meter_id = ? ", [req.params.id], async function (err) {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
			db.close();
		} else {
			let path = "";
			const row = await runQuery(db, "select ip_address from power_meter where id = ?", [req.params.id]);
			if (row && row.length > 0) {
				path = getDBFilePath(row[0].ip_address);
			}
			db.run("delete from power_meter where id = ? ", [req.params.id], function (err) {
				if (err) {
					res.send(JSON.stringify({ "error": err.message }));
				} else {
					if (fs.existsSync(path)) {
						try {
							fs.rmSync(path, { recursive: true });
						} catch (err) {
							console.error(err);
						}
					}
					res.send(JSON.stringify({ count: this.changes }));
				}
				db.close();
			});
		}
	});
});

/**
 * Update powermeter by ID
 */
router.put("/:id", (req, res) => {
	const valid: Joi.ValidationResult = power_meter.validate(req.body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("update power_meter set power_meter_name = ?, ip_address = ?, port = ?, time_zone = ?, enabled = ? where id = ? ",
			[
				req.body.power_meter_name,
				req.body.ip_address,
				req.body.port,
				req.body.time_zone,
				req.body.enabled,
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
router.post("/", async (req, res) => {
	const valid: Joi.ValidationResult = power_meter.validate(req.body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		const rows = await runQuery(db, "select * from power_meter where ip_address=?", [req.body.ip_address]);
		if (rows && rows.length > 0) {
			res.status(400).send({ message: "Duplicated IP address" });
		} else {
			db.run("insert into power_meter (power_meter_name, ip_address, port, time_zone, enabled) values (?,?,?,?,?)",
				[
					req.body.power_meter_name,
					req.body.ip_address,
					req.body.port,
					req.body.time_zone,
					req.body.enabled,
				], async function (err) {
					if (err) {
						res.send(JSON.stringify({ "error": err.message }));
					} else {
						const lastID = this.lastID;
						const message: { message?: string; lastID?: number; }[] = [];
						message.push({ lastID });
						const insertMoment = dayjs();
						const filePath = (process.env.WORKDIR as string);
						const subdir = path.join(filePath, req.body.ip_address);
						if (!fs.existsSync(subdir)) {
							fs.mkdirSync(subdir, { recursive: true });
						}
						const dbFile = path.join(subdir, insertMoment.format("YYYY-MM") + "-monthly.sqlite");
						let measurementsDB: Database;
						try {
							if (!fs.existsSync(dbFile)) {
								measurementsDB = new Database(dbFile);
								const result = await runQuery(measurementsDB, `CREATE TABLE "Measurements" ("id" INTEGER NOT NULL,"channel" INTEGER,"measured_value" REAL,"recorded_time" INTEGER, PRIMARY KEY("id" AUTOINCREMENT))`, []);
								console.log(result);
							} else {
								measurementsDB = new Database(dbFile);
							}
							const channels: string[] = [];
							for (let i: number = 1; i <= 12; i++) {
								const result = await runQuery(db, "insert into channels (power_meter_id, channel, channel_name, enabled) values (?,?,?,?)", [lastID, i, `ch${i}`, true]);
								console.log(result);
								channels.push(i.toString());
							}
							measurementsDB.close();
							const result = await getMeasurementsFromPowerMeter(dayjs(), req.body, channels);
							console.log(result);
						} catch (err) {
							console.error(dayjs().format(), err);
							if (err) {
								message.push({ message: err.toString() });
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
