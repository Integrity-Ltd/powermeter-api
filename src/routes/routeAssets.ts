import { Router } from "express";
import Joi from "joi";
import { Database } from "sqlite3";
import assets from "../models/assets";
import assetNames from "../models/asset_names";
const router = Router();

/**
 * Get all assets from DB
 */
router.get("/", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	if (req.query.first && req.query.rowcount) {
		db.all("select a.id, a.channel_id, c.power_meter_id, n.id as asset_name_id, n.name as asset_name, c.channel_name, p.power_meter_name "
            + "from assets a LEFT JOIN channels c on c.id = a.channel_id "
            + "LEFT JOIN asset_names n on n.id = a.asset_name_id "
            + "LEFT JOIN power_meter p on p.id = c.power_meter_id "
            + "limit ? offset ? ",
		[parseInt(req.query.rowcount as string), parseInt(req.query.first as string)], (err, rows) => {
			if (err) {
				res.send(JSON.stringify({ "error": err.message }));
			} else {
				res.send(rows);
			}
			db.close();
		});
	} else {
		db.all("select * from assets", (err, rows) => {
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
 * Get count of assets
 */
router.get("/count", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select count(*) as count from assets", (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Get asset names
 */
router.get("/asset_names", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.all("select * from asset_names order by name", (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Get asset by ID
 */
router.get("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.get("select * from assets where id = ? ", [req.params.id], (err, rows) => {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(rows);
		}
		db.close();
	});
});

/**
 * Delete asset by ID
 */
router.delete("/:id", (req, res) => {
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.run("delete from assets where id = ? ", [req.params.id], function (err) {
		if (err) {
			res.send(JSON.stringify({ "error": err.message }));
		} else {
			res.send(JSON.stringify({ count: this.changes }));
		}
		db.close();
	});
	cleanupAssetNames();
});

/**
 * Update asset by ID
 */
router.put("/:id", (req, res) => {
	const valid: Joi.ValidationResult = assets.validate(req.body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("update assets set asset_name_id = ?, channel_id = ? where id = ? ",
			[
				req.body.asset_name_id,
				req.body.channel_id,
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
	cleanupAssetNames();
});

/**
 * Create asset
 */
router.post("/", async (req, res) => {
	const valid: Joi.ValidationResult = assets.validate(req.body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("insert into assets (asset_name_id, channel_id) values (?,?)",
			[
				req.body.asset_name_id,
				req.body.channel_id,
			], async function (err) {
				if (err) {
					res.send(JSON.stringify({ "error": err.message }));
				} else {
					res.send({ lastID: this.lastID });
				}
				db.close();
			});
	} else {
		res.status(400).send({ message: valid.error });
	}
});

router.post("/asset_names", async (req, res) => {
	const valid: Joi.ValidationResult = assetNames.validate(req.body);
	if (!valid.error) {
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		db.run("insert into asset_names (name) values (?)",
			[
				req.body.name,
			], async function (err) {
				if (err) {
					res.send(JSON.stringify({ "error": err.message }));
				} else {
					res.send({ lastID: this.lastID });
				}
				db.close();
			},
		);
	} else {
		res.status(400).send({ message: valid.error });
	}
});

function cleanupAssetNames() {
	const sql = "delete from asset_names where id in ("
        + "select nid from (select a.id as aid, n.id as nid, count(n.id)"
        + " from asset_names n"
        + " left join assets a on a.asset_name_id = n.id"
        + " group by n.id"
        + " having a.id is null))";
	const db = new Database(process.env.CONFIG_DB_FILE as string);
	db.run(sql, (err) => {
		if (err) {
			console.error(err);
		} else {

		}
		db.close();
	});
}

export default router;
