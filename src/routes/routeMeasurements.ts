import { Router } from "express";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Database } from "sqlite3";
import { getMeasurementsFromDBs, getDetails, getYearlyMeasurementsFromDBs, getPowerMeterTimeZone, runQuery, getAvgSum, roundToFourDecimals, ResultAVG } from "../../../powermeter-utils/src/utils/DBUtils";
import report from "../models/report";
import Joi from "joi";
import { Measurement, RecElement } from "../../../powermeter-utils/src/utils/types";

const router = Router();
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Report measurements
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/report", async (req, res) => {
	const valid: Joi.ValidationResult = report.validate(req.query);

	if (valid.error) {
		// eslint-disable-next-line
		console.log("Invalid query!");
		return res.status(400).send({ err: valid.error.message });
	}

	const ip = req.query.ip as string;
	const details = req.query.details as string;
	const channel = parseInt(req.query.channel as string);
	const multiplier = parseInt(req.query.multiplier as string);

	const powermeterTimeZone = await getPowerMeterTimeZone(ip);

	const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
	const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

	if (!fromDate.isBefore(toDate)) {
		return res.status(400).send({ err: "invalid date range" });
	}

	let measurements: Measurement[];
	if (fromDate.get("year") < dayjs().get("year")) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
		measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel);
	} else {
		measurements = await getMeasurementsFromDBs(fromDate, toDate, ip, channel);
	}
	let result = getDetails(measurements, powermeterTimeZone, details, false);
	result = result.map((element: RecElement) => {
		element.multipliedValue = roundToFourDecimals(element.diff ? element.diff * multiplier : 0);
		return element;
	});
	return res.send(result);
});

router.get("/getrawdata", (req, res) => {
	const ip = req.query.ip as string;
	const channel = parseInt(req.query.channel as string);
	const fromDate = dayjs(req.query.fromdate as string, "YYYY-MM-DD");//timeZone
	const toDate = dayjs(req.query.todate as string, "YYYY-MM-DD");//timeZone

	if (fromDate.get("year") < dayjs().get("year")) {
		getYearlyMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
			return res.send(result);
		}).catch((err) => {
			// eslint-disable-next-line
			console.error(err);
		});
	} else {
		getMeasurementsFromDBs(fromDate, toDate, ip, channel).then((result) => {
			return res.send(result);
		}).catch((err) => {
			// eslint-disable-next-line
			console.error(err);
		});
	}
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/getavgsum", async (req, res) => {
	let average = [];
	try {
		const fromDate = dayjs(req.query.fromDate as string, "YYYY-MM-DD");
		const toDate = dayjs(req.query.toDate as string, "YYYY-MM-DD");
		if (!fromDate.isBefore(toDate)) {
			res.status(400).send({ err: "invalid date range" });
			return;
		}

		const channels = req.query.channels as string;
		let channelsArray: number | number[] | undefined;
		if (channels) {
			channelsArray = channels.split(",").map((element) => {
				return parseInt(element);
			});
		}

		let measurements: Measurement[];
		if (fromDate.get("year") < dayjs().get("year")) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
			measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, req.query.ip as string, channelsArray);
		} else {
			measurements = await getMeasurementsFromDBs(fromDate, toDate, req.query.ip as string, channelsArray);
		}
		const timeZone = await getPowerMeterTimeZone(req.query.ip as string);
		average = getAvgSum(measurements, timeZone);
	} catch (err) {
		// eslint-disable-next-line
		console.error(err);
		return res.status(400).send({ err: "invalid query" });
	}
	return res.send(average);
});

interface StatisticRow {
	asset_name: string;
	ip_address: string;
	power_meter_name: string;
	channel: number;
	channel_name: string;
	sum: number;
	avg: number;
}

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/statistics", async (req, res) => {
	const average: StatisticRow[] = [];
	try {
		let fromDate: dayjs.Dayjs = dayjs();
		const toDate = dayjs();
		switch (req.query.details) {
			case "1d": fromDate = toDate.add(-1, "day").add(-1, "hour"); break;
			case "30d": fromDate = toDate.add(-30, "day").add(-1, "hour"); break;
			default: fromDate = toDate.add(-2, "hour");
		}

		if (!fromDate.isBefore(toDate)) {
			res.status(400).send({ err: "invalid date range" });
			return;
		}

		const assetNameId = parseInt(req.query.asset_name_id as string);

		const sql = "select n.name, p.ip_address, p.power_meter_name, c.channel, c.channel_name from assets a"
			+ " join asset_names n on n.id = a.asset_name_id"
			+ " join channels c on c.id = a.channel_id"
			+ " join power_meter p on p.id = c.power_meter_id"
			+ " where asset_name_id = ? ";
		const db = new Database(process.env.CONFIG_DB_FILE as string);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const rows = await runQuery(db, sql, [assetNameId]);

		for (const row of rows) {
			let measurements: Measurement[];
			if (fromDate.get("year") < dayjs().get("year")) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				measurements = await getYearlyMeasurementsFromDBs(fromDate, toDate, row.ip_address, row.channel);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				measurements = await getMeasurementsFromDBs(fromDate, toDate, row.ip_address, row.channel);
			}
			const timeZone = await getPowerMeterTimeZone(req.query.ip as string);
			const calculated = getAvgSum(measurements, timeZone);
			calculated.forEach((element: ResultAVG) => {
				average.push({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
					asset_name: row.name, ip_address: row.ip_address, power_meter_name: row.power_meter_name, channel: element.channel, channel_name: row.channel_name, sum: Number(element.sum), avg: Number(roundToFourDecimals(element.avg)),
				});
			});
		}
		return res.send(average);
	} catch (err) {
		// eslint-disable-next-line
		console.error(err);
		return res.status(400).send({ err: "invalid query" });
	}
});

export default router;
