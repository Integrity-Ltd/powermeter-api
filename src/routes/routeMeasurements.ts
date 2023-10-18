import { Router } from "express";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import path from "path";
import { Database } from "sqlite3";
import { runQuery, getMeasurementsFromDBs, getDetails, getYearlyMeasurementsFromDBs, getAverage, getPowerMeterTimeZone, getSumm } from "../../../powermeter-utils/src/utils/DBUtils";
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

    let timeZone = await getPowerMeterTimeZone(ip);

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

router.get("/getaverage", async (req, res) => {
    const filters = req.query.filters as string;
    let average: number[] = [];
    try {
        const jsonFilters = JSON.parse(filters);

        if (!jsonFilters.fromDate.isBefore(jsonFilters.toDate)) {
            res.status(400).send({ err: "invalid date range" });
            return;
        }

        let measurements: any[];
        if (jsonFilters.fromDate.get("year") < dayjs().get("year")) {
            measurements = await getYearlyMeasurementsFromDBs(jsonFilters.fromDate, jsonFilters.toDate, jsonFilters.ip, jsonFilters.channel);
        } else {
            measurements = await getMeasurementsFromDBs(jsonFilters.fromDate, jsonFilters.toDate, jsonFilters.ip, jsonFilters.channels);
        }
        average = getAverage(measurements);
    } catch (err) {
        console.error(err);
        return res.status(400).send({ err: "invalid query" });
    }
    return res.send(average);
})

router.get("/getsumm", async (req, res) => {
    const filters = req.query.filters as string;
    let summ: number[] = [];
    try {
        const jsonFilters = JSON.parse(filters);

        if (!jsonFilters.fromDate.isBefore(jsonFilters.toDate)) {
            res.status(400).send({ err: "invalid date range" });
            return;
        }

        let measurements: any[];
        if (jsonFilters.fromDate.get("year") < dayjs().get("year")) {
            measurements = await getYearlyMeasurementsFromDBs(jsonFilters.fromDate, jsonFilters.toDate, jsonFilters.ip, jsonFilters.channel);
        } else {
            measurements = await getMeasurementsFromDBs(jsonFilters.fromDate, jsonFilters.toDate, jsonFilters.ip, jsonFilters.channels);
        }
        summ = getSumm(measurements);
    } catch (err) {
        console.error(err);
        return res.status(400).send({ err: "invalid query" });
    }
    return res.send(summ);
})

export default router;