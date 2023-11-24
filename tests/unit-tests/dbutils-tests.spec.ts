import "jest";
import { getDBFilePath, getMeasurementsFromDBs, getYearlyMeasurementsFromDBs } from "../../../powermeter-utils/src/utils/DBUtils";
import path from "path";
import dayjs from "dayjs";

describe("Utils tests", () => {
	beforeEach(() => { });
	it("DBUtils getDBFilePath should be string", () => {
		const ip = "192.168.1.237";
		const filePath = getDBFilePath(ip);
		const matchPath = path.join(process.env.WORKDIR as string, ip);
		expect(filePath).toEqual(matchPath);
	});
	it("get measurements for all channels", async () => {
		const ip = "192.168.1.237";
		const result = await getMeasurementsFromDBs(dayjs("2023-01-01"), dayjs("2023-01-02"), ip);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	it("get measurements for one channels", async () => {
		const ip = "192.168.1.237";
		const result = await getMeasurementsFromDBs(dayjs("2023-01-01"), dayjs("2023-01-02"), ip, 1);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	it("get measurements for more channels", async () => {
		const ip = "192.168.1.237";
		const result = await getMeasurementsFromDBs(dayjs("2023-01-01"), dayjs("2023-01-02"), ip, [1, 2]);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	it("get Yearly measurements for all channels", async () => {
		const ip = "192.168.1.237";
		const result = await getYearlyMeasurementsFromDBs(dayjs("2022-01-01"), dayjs("2022-01-02"), ip);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	it("get Yearly measurements for one channels", async () => {
		const ip = "192.168.1.237";
		const result = await getYearlyMeasurementsFromDBs(dayjs("2022-01-01"), dayjs("2022-01-02"), ip, 1);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	it("get Yearly measurements for more channels", async () => {
		const ip = "192.168.1.237";
		const result = await getYearlyMeasurementsFromDBs(dayjs("2022-01-01"), dayjs("2022-01-02"), ip, [1, 2]);
		expect(Array.isArray(result) && result.length > 0).toBe(true);
	});
	afterAll(() => { });
});
