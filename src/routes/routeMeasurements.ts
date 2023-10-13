import { Router } from "express";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import path from "path";
import { Database } from "sqlite3";
import { runQuery, getMeasurementsFromDBs, getDetails, getYearlyMeasurementsFromDBs } from "../../../powermeter-utils/src/utils/DBUtils";
import fs from "fs";
import report from "../models/report";
import Joi from "joi";

const router = Router();
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Report measurements
 */
router.get("/report", async (req, res) => {
    let valid: Joi.ValidationResult = report.validate(req.query);

    if (valid.error) {
        console.log("Invalid query!");
        res.status(400).send({ err: valid.error.message });
        return;
    }

    const ip = req.query.ip as string;
    const details = req.query.details as string;
    const channel = parseInt(req.query.channel as string);
    const multiplier = parseInt(req.query.multiplier as string);

    const configDB = new Database(process.env.CONFIG_DB_FILE as string);

    let timeZone = dayjs.tz.guess();
    const tzone = await runQuery(configDB, "select time_zone from power_meter where ip_address=? and enabled = 1", [ip]);
    if (tzone.length > 0) {
        timeZone = tzone[0].time_zone;
    }
    const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
    const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

    if (!fromDate.isBefore(toDate)) {
        res.status(400).send({ err: "invalid date range" });
        return;
    }

    let measurements: any[];
    if (fromDate.get("year") < dayjs().get("year")) {
        measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel);
    } else {
        measurements = await getMeasurementsFromDBs(fromDate, toDate, ip, channel);
    }
    let result = getDetails(measurements, timeZone, details, false);
    result = result.map((element: any) => {
        element.multipliedValue = element.diff * multiplier;
        return element;
    })
    res.send(result);
});

router.get("/getrawdata", async (req, res) => {
    const ip = req.query.ip as string;
    const channel = parseInt(req.query.channel as string);
    const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
    const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

    if (fromDate.get("year") < dayjs().get("year")) {
        getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
            res.send(result);
        }).catch((err) => {
            console.error(err);
        });
    } else {
        getMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
            res.send(result);
        }).catch((err) => {
            console.error(err);
        });
    }
})

router.get("/getrawdata/count", async (req, res) => {
})

export default router;