import { Router } from "express";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import path from "path";
import { Database } from "sqlite3";
import { getMeasurementsFromDBs, getDetails, getYearlyMeasurementsFromDBs, getAvgSumm, getPowerMeterTimeZone } from "../../../powermeter-utils/src/utils/DBUtils";
import report from "../models/report";
import Joi from "joi";
import { get } from "http";

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
        return res.status(400).send({ err: valid.error.message });
    }

    const ip = req.query.ip as string;
    const details = req.query.details as string;
    const channel = parseInt(req.query.channel as string);
    const multiplier = parseInt(req.query.multiplier as string);

    let powermeterTimeZone = await getPowerMeterTimeZone(ip);

    const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
    const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

    if (!fromDate.isBefore(toDate)) {
        return res.status(400).send({ err: "invalid date range" });
    }

    let measurements: any[];
    if (fromDate.get("year") < dayjs().get("year")) {
        measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel);
    } else {
        measurements = await getMeasurementsFromDBs(fromDate, toDate, ip, channel);
    }
    let result = getDetails(measurements, powermeterTimeZone, details, false);
    result = result.map((element: any) => {
        element.multipliedValue = element.diff * multiplier;
        return element;
    })
    return res.send(result);
});

router.get("/getrawdata", async (req, res) => {
    const ip = req.query.ip as string;
    const channel = parseInt(req.query.channel as string);
    const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
    const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

    if (fromDate.get("year") < dayjs().get("year")) {
        getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
            return res.send(result);
        }).catch((err) => {
            console.error(err);
        });
    } else {
        getMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
            return res.send(result);
        }).catch((err) => {
            console.error(err);
        });
    }
})

router.get("/getavgsumm", async (req, res) => {
    let average = [];
    try {
        const fromDate = dayjs(req.query.fromDate as string, "YYYY-MM-DD");
        const toDate = dayjs(req.query.toDate as string, "YYYY-MM-DD");
        if (!fromDate.isBefore(toDate)) {
            res.status(400).send({ err: "invalid date range" });
            return;
        }

        const channels = req.query.channels as string;
        let channelsArray: number | number[] | undefined = undefined;
        if (channels) {
            channelsArray = channels.split(",").map((element) => { return parseInt(element) });
        }

        let measurements: any[];
        if (fromDate.get("year") < dayjs().get("year")) {
            measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, req.query.ip as string, channelsArray);
        } else {
            measurements = await getMeasurementsFromDBs(fromDate, toDate, req.query.ip as string, channelsArray);
        }
        const timeZone = await getPowerMeterTimeZone(req.query.ip as string);
        average = getAvgSumm(measurements, timeZone);
    } catch (err) {
        console.error(err);
        return res.status(400).send({ err: "invalid query" });
    }
    return res.send(average);
})

export default router;