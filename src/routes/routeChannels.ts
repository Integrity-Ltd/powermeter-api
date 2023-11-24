import { Router } from "express";
import channels from "../models/channels";
import Joi from "joi";
import { Database } from "sqlite3";
const router = Router();

interface ChannelBody {
	power_meter_id: number;
	channel: number;
	channel_name: string;
	enabled: boolean;
}

interface Filter {
	power_meter_id: string;
}

/**
 * Get all channels
 */
router.get("/", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	if (req.query.first && req.query.rowcount) {
		db.all("select * from channels limit ? offset ?", [parseInt(req.query.rowcount as string), parseInt(req.query.first as string)], (err, rows) => {
			if (err) {
				res.send(JSON.stringify({ "error": err.message }));
			} else {
				res.send(rows);
			}
			db.close();
		});
	} else if (req.query.filter) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const filter: Filter = JSON.parse(decodeURIComponent(req.query.filter as string));
			if (filter.power_meter_id) {
				db.all("select * from channels where power_meter_id=?", [parseInt(filter.power_meter_id)], (err, rows) => {
					if (err) {
						res.send(JSON.stringify({ "error": err.message }));
					} else {
						res.send(rows);
					}
					db.close();
				});
			}
		} catch (err) {
			res.status(400).send(err);
		}
	} else {
		db.all("select * from channels", (err, rows) => {
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
 * Get all channels count
 */
router.get("/count", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select count(*) as count from channels", (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Get channel by ID
 */
router.get("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select * from channels where id = ? ", [req.params.id], (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Delete channel by ID
 */
router.delete("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.run("delete from channels where id = ? ", [req.params.id], function (err) {
		if (err) {
			res.send(JSON.stringify({ error: err.message }));
		} else {
			res.send(JSON.stringify({ count: this.changes }));
		}
		db.close();
	});
});

/**
 * Update channel by ID
 */
router.put("/:id", (req, res) => {
	const body: ChannelBody = req.body as ChannelBody;
	const valid: Joi.ValidationResult = channels.validate(body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("update channels set power_meter_id = ?, channel = ?, channel_name = ?, enabled = ? where id = ? ",
			[
				body.power_meter_id,
				body.channel,
				body.channel_name,
				body.enabled,
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
 * Create channel
 */
router.post("/", (req, res) => {
	const body: ChannelBody = req.body as ChannelBody;
	const valid: Joi.ValidationResult = channels.validate(body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("insert into channels (power_meter_id, channel, channel_name, enabled) values (?,?,?,?)",
			[
				body.power_meter_id,
				body.channel,
				body.channel_name,
				body.enabled,
			], function (err) {
				if (err) {
					res.send(JSON.stringify({ "error": err.message }));
				} else {
					res.send(JSON.stringify({ "lastID": this.lastID }));
				}
				db.close();
			});
	} else {
		res.status(400).send({ message: valid.error });
	}
});

export default router;
