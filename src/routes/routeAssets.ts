import { Router } from "express";
import Joi from "joi";
import { Database } from "sqlite3";
import assets from "../models/assets";
const router = Router();

/**
 * Get all powermeter from DB
 */
router.get("/", (req, res) => {
    let db = new Database(process.env.CONFIG_DB_FILE as string);
    if (req.query.first && req.query.rowcount) {
        db.all("select a.id, a.power_meter_id, a.channel_id, a.asset_name, c.channel_name, p.power_meter_name "
            + "from assets a LEFT JOIN channels c on c.id = a.channel_id "
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
 * Get count of powermeter
 */
router.get("/count", (req, res) => {
    let db = new Database(process.env.CONFIG_DB_FILE as string);
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
 * Get powermeter by ID
 */
router.get("/:id", (req, res) => {
    let db = new Database(process.env.CONFIG_DB_FILE as string);
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
 * Delete powermeter by ID
 */
router.delete("/:id", (req, res) => {
    let db = new Database(process.env.CONFIG_DB_FILE as string);
    db.run("delete from assets where id = ? ", [req.params.id], function (err) {
        if (err) {
            res.send(JSON.stringify({ "error": err.message }));
        } else {
            res.send(JSON.stringify({ count: this.changes }));
        }
        db.close();
    });
});

/**
 * Update powermeter by ID
 */
router.put("/:id", (req, res) => {
    let valid: Joi.ValidationResult = assets.validate(req.body);
    if (!valid.error) {
        let db = new Database(process.env.CONFIG_DB_FILE as string);
        db.run("update assets set asset_name = ?, power_meter_id = ?, channel_id = ? where id = ? ",
            [
                req.body.asset_name,
                req.body.power_meter_id,
                req.body.channel_id,
                req.params.id
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
    let valid: Joi.ValidationResult = assets.validate(req.body);
    if (!valid.error) {
        let db = new Database(process.env.CONFIG_DB_FILE as string);
        db.run("insert into assets (asset_name, power_meter_id, channel_id) values (?,?,?)",
            [
                req.body.asset_name,
                req.body.power_meter_id,
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

export default router;
